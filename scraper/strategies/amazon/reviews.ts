import cheerio from "cheerio";
import {
  compose,
  either,
  invoker,
  map,
  objOf,
  mergeAll,
  prop,
  split,
} from "ramda";
import {
  normalizeText,
  numberOrNA,
  normalizeNumber,
  invoke,
  fromStrategy,
  select,
  $prop,
  $text,
  $html,
  $map,
} from "../utils";
import { Strategy } from "../types";
import { loadStrategy, RunStrategy, ScrapedItem } from "../../scraper";

const REVIEWS_SELECTOR = `div[data-hook="review"]`;

export type Review = ScrapedItem & {
  reviewId: string;
  date: Date;
  verifiedPurchase: boolean;
  rater: string;
  rating: number;
  title: string;
  reviewBody: string;
  helpfulCount: number;
};

export type ReviewMeta = ScrapedItem & {
  ratingsCount: number;
  ratingsDistribution: {
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
  };
  reviewsCount: number;
};

const amazonReviewStrategy: Strategy<Review> = {
  selector: () => REVIEWS_SELECTOR,
  reviewId: compose(invoke("prop", "id"), fromStrategy),
  date: $text(`span[data-hook="review-date"]`),
  verifiedPurchase: compose(
    invoke("includes", "Verified Purchase"),
    invoke("html"),
    fromStrategy
  ),
  rater: $text("span.a-profile-name"),
  rating: compose(
    numberOrNA,
    $text(`i[data-hook="review-star-rating"] > span`)
  ),
  title: compose($text(`a[data-hook="review-title"] > span`)),
  reviewBody: compose(
    normalizeText,
    either(
      $text(`div[data-hook="review-collapsed"] > span`),
      $text(`span[data-hook="review-body"] > span`)
    )
  ),
  helpfulCount: compose(
    numberOrNA,
    invoker(2, "replace")("One", 1),
    $text(`span[data-hook="helpful-vote-statement"]`)
  ),
};

export const scrapeReviews: RunStrategy<Review> = loadStrategy(
  amazonReviewStrategy
);

export const checkForMoreReviews: (html: string) => boolean = (html) => {
  const $ = cheerio.load(html);

  return $("div#cm_cr-pagination_bar li.a-last > a").length !== 0;
};

const amazonReviewMetadataStrategy: Strategy<ReviewMeta> = {
  selector: () => "body",
  ratingsCount: compose(
    (x) => (console.log(`ratings`, x), x),
    numberOrNA,
    prop(0),
    split(" | "),
    $text("div#filter-info-section span")
  ),
  ratingsDistribution: compose(
    mergeAll,
    $map((el, idx) =>
    compose(objOf(`${idx + 1}`), invoker(1, "prop")("aria-valuenow"))(el)
    ),
    select("table#histogramTable div[aria-valuenow]")
  ),
  reviewsCount: compose(
    (x) => (console.log(`reviews`, x), x),
    numberOrNA,
    prop(1),
    split(" | "),
    $text("div#filter-info-section span")
  ),
};

export const scrapeReviewsMeta: RunStrategy<ReviewMeta> = loadStrategy(
  amazonReviewMetadataStrategy
);
