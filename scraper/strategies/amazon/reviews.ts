import { compose, head, either, converge, concat, flip } from "ramda";
import {
  normalizeText,
  numberOrNA,
  normalizeProductLink,
  invoke,
  fromStrategy,
  select,
  $prop,
  $text,
  $html,
} from "../utils";
import { Strategy } from "../types";
import { loadStrategy, RunStrategy, ScrapedItem } from "../../scraper";

const REVIEWS_SELECTOR = `.reviews-content > div > div`;

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
    parseFloat,
    $text(`i[data-hook="review-star-rating"] > span`)
  ),
  title: compose($text(`a[data-hook="review-title"] > span`)),
  reviewBody: compose(
    normalizeText,
    $text(`div[data-hook="review-collapsed"] > span`)
  ),
  helpfulCount: compose(
    numberOrNA,
    parseFloat,
    $text(`span[data-hook="helpful-vote-statement"]`)
  ),
};

export const scrapeReviews: RunStrategy<Review> = loadStrategy(
  amazonReviewStrategy
);
