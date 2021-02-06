import cheerio from "cheerio";
import { Strategy } from "./strategies/types";

export type ScrapedItem = {
  selector?: string;
  url?: string;
};

export type RunStrategy<K> = (html: string, selector?: string) => K[];

type LoadStrategy<K> = (
  x: Strategy<K>,
  condition?: (
    idx: number,
    el: cheerio.Element,
    selection: cheerio.Cheerio
  ) => boolean
) => RunStrategy<K>;

export const loadStrategy: LoadStrategy<any> = (strategy, condition) => (
  html
) => {
  const $ = cheerio.load(html);
  const results = [];
  const selector = strategy.selector(null, null);

  $(selector).each(function (idx, el) {
    if (condition !== undefined && !condition(idx, el, $(selector))) return;

    const result = {};

    for (const prop in strategy) {
      try {
        if (prop === "selector") continue;
        result[prop] = strategy[prop]($, el);
      } catch (e) {
        result[prop] = "Error";
      }
    }

    results.push(result);
  });

  return results;
};
