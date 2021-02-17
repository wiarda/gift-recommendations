import { Page } from "puppeteer";
import { State } from "../puppeteer/state";
import {
  compose,
  objOf,
  merge,
  path,
  unary,
  filter,
  map,
  prop,
  equals,
} from "ramda";
import { Product, scrapeProducts } from "../strategies/amazon/products";
import {
  scrapeReviews,
  Review,
  checkForMoreReviews,
  scrapeReviewsMeta,
} from "../strategies/amazon/reviews";
import { page, chrome } from "../puppeteer/index";
import { ScrapeState } from "../puppeteer/state";
import { FsDb } from "../db/fsDb";
import {
  lift,
  click,
  goto,
  content,
  type,
  waitForSelector,
  waitForTimeout,
  waitForRandTimeout,
  configureViewport,
  extractWithStrategy,
  mergeWithStrategy,
  waitForDom,
  tag,
  saveHtml,
  writeToDb,
  testContent,
  loop,
  returnA,
  returnStore,
} from "../puppeteer/pageActions";
import { PageQueue, wait, checkin } from "../task-manager/pageQueue";

const initState = () => ({
  db: FsDb("./output"),
  curr: null,
  store: [],
});

type ProductReviews = Product & {
  reviews: Array<Review>;
};

function getProductListings(
  keyword: string,
  page: Promise<Page>
): Promise<Array<Product>> {
  const state: ScrapeState = initState();

  // Search for product list
  return (
    page
      .then(lift(state))
      .then(goto("https://www.amazon.com/"))
      .then(tag("Search page loaded"))
      // todo: check for throttling
      .then(type("input#twotabsearchtextbox", keyword))
      .then(click("input#nav-search-submit-button"))
      .then(waitForDom)
      .then(tag("Product page loaded"))
      .then(saveHtml(`${Date.now()}-${keyword}-listings.html`))
      .then(extractWithStrategy(scrapeProducts))
      .then(writeToDb(`${keyword}-listings`))
      .then(returnA) as Promise<Array<Product>>
  );
}

function getReviews(
  product: Product,
  page: Promise<Page>
): Promise<Array<Review>> {
  const { link, asin } = product;
  const state: ScrapeState = initState();

  return page
    .then(lift(state))
    .then(goto(link))
    .then(waitForDom)
    .then(saveHtml(`${asin}-product-page`))
    .then(extractWithStrategy(scrapeReviews))
    .then(writeToDb(`${asin}-reviews`))
    .then(returnA)
    .catch((e) => {
      const msg = `Err getting reviews for ${asin} at ${link}\n${e.message}`;
      state.db.write([msg], "errors");
      return [msg];
    }) as Promise<Array<Review>>;
}

export const hasMoreReviews: (
  x: State<Page, ScrapeState>
) => Promise<boolean> = ([page, state]) => {
  return Promise.resolve(page)
    .then(lift(state))
    .then(async ([page, state]) => {
      const html = await page.content();
      return checkForMoreReviews(html);
    });
};

/**
 * Using a single page instance, recursively scrape all reviews from a product
 * @param product
 * @param page
 */
async function getAllReviews(
  product: Product,
  page: Promise<Page>,
  pageNumber: string
): Promise<Array<Review>> {
  const { asin } = product;
  const state: ScrapeState = initState();

  let i = pageNumber ? parseInt(pageNumber) : 1;
  const url = pageNumber
    ? `https://www.amazon.com/product-reviews/${asin}/ref=cm_cr_getr_d_paging_btm_${pageNumber}?ie=UTF8&pageNumber=${pageNumber}&pageSize=10`
    : `https://www.amazon.com/product-reviews/${asin}`;

  console.log({ pageNumber, url });

  const reviewPage = page
    .then(lift(state))
    .then(tag("loading review page"))
    .then(goto(url))
    .then(waitForSelector("div#cm_cr-pagination_bar"))
    .then(tag("review page loaded"));

  const metaData = await reviewPage.then(async ([page, state]) => {
    const html = await page.content();
    const url = await page.url();
    const meta = scrapeReviewsMeta(html)[0];

    return { url, ...meta };
  });
  console.log(metaData);

  // TODO:
  // add scrolling to element
  // https://stackoverflow.com/questions/51529332/puppeteer-scroll-down-until-you-cant-anymore

  // sample: lots of reviews stroller - B00FZP3E8A
  // not many reviews cupholder - B07BPZNBJV

  const getMoreReviews: (
    x: State<Page, ScrapeState>
  ) => Promise<State<Page, ScrapeState>> = (ctx) => {

    return Promise.resolve(ctx)
      .then(waitForRandTimeout(500, 1200))
      .then(waitForSelector("div#cm_cr-pagination_bar"))
      .then(tag(`getting reviews from page ${i}`))
      .then(saveHtml(`${asin}-reviews-page-${i++}`))
      .then(mergeWithStrategy(metaData, scrapeReviews))
      .then(writeToDb(`${asin}-reviews`))
      .then(tag("continuing to next page"))
      .then(click("div#cm_cr-pagination_bar li.a-last > a"))
      .then(waitForRandTimeout(2000, 3000));
  }; 

  return reviewPage
    .then(tag("Beginning review extraction"))
    .then(loop(testContent(checkForMoreReviews), getMoreReviews))
    .then(tag("Exiting loop"))
    .then(returnStore)
    .catch((e) => {
      const msg = `Err getting reviews for ${asin} at ${url}\n${e.message}`;
      state.db.write([msg], "errors");
      return [msg];
    }) as Promise<Array<Review>>;
}

async function getProductReviews(keyword: string): Promise<ProductReviews[]> {
  const reqs: Promise<ProductReviews>[] = [];
  const queue = PageQueue(10, chrome);

  // get reviews for each product
  const products = await getProductListings(keyword, page);
  while (products.length > 0) {
    const page = queue.dequeue();

    if (!page) {
      await wait(100);
      continue;
    }

    const product = products.pop();
    const req: Promise<ProductReviews> = getReviews(product, page).then(
      compose(merge(product), objOf("reviews"))
    );

    reqs.push(req);
    req.then(checkin(page, queue));
  }

  return Promise.all(reqs);
}

export const amazon = {
  listings: async (req, res) => {
    const keyword = req?.body?.keyword;
    const results = await getProductListings(keyword, page);

    return res.status(200).send(JSON.stringify(results));
  },
  reviews: async (req, res) => {
    const product = compose(JSON.parse, path(["body", "product"]))(req);
    const results = await getReviews(product, page);

    return res.status(200).send(JSON.stringify(results));
  },
  productReviews: async (req, res) => {
    const keyword = req?.body?.keyword;
    const results = await getProductReviews(keyword);

    return res.status(200).send(JSON.stringify(results));
  },
  getAllReviews: async (req, res) => {
    const asin: string = compose(path(["body", "product"]))(req);
    const pageNumber: string = compose(path(["body", "pageNumber"]))(req);
    const product = { asin } as Product;

    const results = await getAllReviews(product, page, pageNumber);
    // console.log(results)
    return res.status(200).send(JSON.stringify(results));
  },
};
 