import { Db } from "../db/db";
import { Page } from "puppeteer";

export type State<s, a> = [s, a];
export type ScrapeState = {
  db: Db;
  curr: Array<unknown>;
  store: Array<unknown>;
};
export type PageEffect<a, k> = (
  arg: k,
  arg2?: k
) => (x: State<Page, a>) => Promise<State<Page, a>>;
export type PageAction = (x: State<Page, ScrapeState>) => Promise<State<Page, ScrapeState>>;
export type ViewportConfig = {
  width: number;
  height: number;
};
export type Loop<T> = (
  condition: (x: State<Page, T>) => Promise<boolean>,
  next: (x: State<Page, T>) => Promise<State<Page, T>>,
) => (ctx: State<Page, T>) => Promise<State<Page, T>>;
