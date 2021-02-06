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

// As of 1-16-20: products have a unique asin attribute with a non-null value
export const PRODUCTS_SELECTOR = `div[data-asin]:not([data-asin=""])`;

export type Product = ScrapedItem & {
  asin: number;
  name: string;
  price: number | "NA";
  link: string;
  thumbnail: string;
  rating: number | "NA";
  reviewCount?: number | "NA";
  srcset?: string;
  imgAlt?: string;
  isSponsored?: boolean;
};

export const amazonProductStrategy: Strategy<Product> = {
  selector: () => PRODUCTS_SELECTOR,
  asin: compose(invoke("prop", "data-asin"), fromStrategy),
  name: compose(
    normalizeText,
    either($text("span.a-truncate-full"), $html("h2 > a > span"))
  ),
  price: converge(compose(numberOrNA, concat), [
    // dollars
    $text("span.a-price-whole"),
    // cents
    $text("span.a-price-fraction"),
  ]),
  link: compose(
    flip(normalizeProductLink)("https://https://www.amazon.com/"),
    $prop("a", "href")
  ),
  thumbnail: $prop("img", "src"),
  rating: compose(
    numberOrNA,
    either(
      $prop("span[data-rt]", "data-rt"),
      compose(head, invoke("split"), $text("span.a-icon-alt"))
    )
  ),
  reviewCount: compose(
    numberOrNA,
    either($text("span[data-rt]"), $text("span > a > span.a-size-base"))
  ),
  srcset: $prop("img", "srcset"),
  imgAlt: $prop("img", "alt"),
  isSponsored: compose((x) => x !== -1, invoke("indexOf"), $prop("img", "alt")),
};

export const scrapeProducts: RunStrategy<Product> = loadStrategy(
  amazonProductStrategy
);
