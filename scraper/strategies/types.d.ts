type StrategyMethod<T> = ($: cheerio.Root, domRoot: cheerio.Element) => T;

export type Strategy<T> = {
  [key in keyof T]: StrategyMethod<T[key]>;
};

export type ScrapedItem = {
  selector?: string;
  url?: string;
};
