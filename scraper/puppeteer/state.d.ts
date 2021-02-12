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
export type PageAction<a> = (x: State<Page, a>) => Promise<State<Page, a>>;
export type ViewportConfig = {
  width: number;
  height: number;
};
