import { Page } from "puppeteer";
import { RunStrategy } from "../scraper";
import {
  ScrapeState,
  PageEffect,
  PageAction,
  State,
  ViewportConfig,
} from "./state";
import { unary, compose } from "ramda";

export const lift: (
  state: ScrapeState
) => (x: Page) => State<Page, ScrapeState> = (state) => (page) => [page, state];

export const click: PageEffect<ScrapeState, string> = (selector) => async ([
  page,
  results,
]) => {
  await page.click(selector);
  return [page, results];
};

/**
 * Selects items from a select menu
 */
export const select: PageEffect<ScrapeState, string | Array<string>> = (
  selector,
  names
) => async ([page, results]) => {
  if (typeof selector !== "string") return [page, results];

  if (Array.isArray(names)) {
    await page.select(selector, ...names);
  } else {
    await page.select(selector, names);
  }

  return [page, results];
};

export const goto: PageEffect<ScrapeState, string> = (uri) => async ([
  page,
  results,
]) => {
  await page.goto(uri, { waitUntil: "networkidle2" });
  return [page, results];
};

export const writeToDb: PageEffect<ScrapeState, string> = (
  query: string
) => async ([page, state]) => {
  const { db, curr } = state;
  db.write(curr, query);

  return [page, state];
};

export const saveHtml: PageEffect<ScrapeState, string> = (
  filename: string
) => async ([page, state]) => {
  const { db } = state;
  const html = await page.content();
  db.export(html, filename);

  return [page, state];
};

export const content: PageAction<ScrapeState> = async ([page, results]) => {
  results.store.push(await page.content());
  return [page, results];
};

export const type: PageEffect<ScrapeState, string> = (
  selector,
  input
) => async ([page, results]) => {
  await page.type(selector, input, { delay: 63 });
  return [page, results];
};

export const waitForSelector: PageEffect<ScrapeState, string> = (
  selector
) => async ([page, results]) => {
  await page.waitForSelector(selector);
  return [page, results];
};

export const waitForTimeout: PageEffect<ScrapeState, number> = (
  duration
) => async ([page, results]) => {
  await page.waitForTimeout(duration);
  return [page, results];
};

export const waitForDom: PageAction<ScrapeState> = async ([page, results]) => {
  // await page.waitForNavigation({ waitUntil: "domcontentloaded" });
  await page.waitForNavigation({ waitUntil: "load" });
  return [page, results];
};

export const waitForNetworkIdle: PageAction<ScrapeState> = async ([
  page,
  results,
]) => {
  await page.waitForNavigation({ waitUntil: "networkidle2" });
  return [page, results];
};

export const tag: PageEffect<ScrapeState, string> = (label) => async ([
  page,
  results,
]) => {
  console.log(label);
  return [page, results];
};

export const extractWithStrategy: (
  strategy: RunStrategy<any>
) => PageAction<ScrapeState> = (strategy) => async ([page, results]) => {
  const html = await page.content();
  const url = await page.url();

  results.store.push({ url, html });

  const output: object[] = strategy(html);

  results.store.push(url, ...output);
  results.curr = output;

  return [page, results];
};

export const configureViewport: PageEffect<ScrapeState, ViewportConfig> = (
  config
) => async ([page, results]) => {
  page.setViewport({ ...config, deviceScaleFactor: 1 });
  return [page, results];
};

export const returnA: (x: State<Page, ScrapeState>) => Array<unknown> = ([
  page,
  state,
]) => {
  return state.curr;
};
