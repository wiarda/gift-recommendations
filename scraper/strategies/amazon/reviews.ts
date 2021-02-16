import cheerio from "cheerio";
import { compose, either, invoker } from "ramda";
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
