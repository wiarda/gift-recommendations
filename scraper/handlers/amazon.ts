import { Page } from "puppeteer";
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
import { scrapeReviews, Review } from "../strategies/amazon/reviews";
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
  configureViewport,
  extractWithStrategy,
  waitForDom,
  tag,
  saveHtml,
  writeToDb,
  returnA,
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
    .catch(e => {
      const msg = `Err getting reviews for ${asin} at ${link}\n${e.message}`;
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
};
