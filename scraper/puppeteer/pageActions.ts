import { prop, compose, path, merge, head } from "ramda";
import { Page } from "puppeteer";
import { RunStrategy } from "../scraper";
import {
  ScrapeState,
  PageEffect,
  PageAction,
  State,
  ViewportConfig,
  Loop,
} from "./state";
import { wait } from "../task-manager/pageQueue";

export const lift: (
  state: ScrapeState
) => (x: Page) => State<Page, ScrapeState> = (state) => (page) => [page, state];

export const click: PageEffect<ScrapeState, string> = (selector) => async ([
  page,
  state,
]) => {
  try {
    await page.click(selector);
    return [page, state];
  } catch (err) {
    // Can't find node to click
    console.error(err.message);

    // invalidate references to current position that might be used for a loop
    state.ref = undefined;
    
    return [page, state];
  }
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

export const content: PageAction = async ([page, results]) => {
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

export const waitForRandTimeout: PageEffect<ScrapeState, number> = (
  low,
  high
) => async ([page, results]) => {
  const duration = low + Math.floor(Math.random() * (high - low + 1));

  await page.waitForTimeout(duration);
  return [page, results];
};

export const waitForDom: PageAction = async ([page, results]) => {
  // await page.waitForNavigation({ waitUntil: "domcontentloaded" });
  await page.waitForNavigation({ waitUntil: "load" });
  return [page, results];
};

export const waitForNetworkIdle: PageAction = async ([page, results]) => {
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

export const extractWithStrategy: (strategy: RunStrategy<any>) => PageAction = (
  strategy
) => async ([page, results]) => {
  const html = await page.content();
  const url = await page.url();

  const output: object[] = strategy(html).map(merge({ url }));

  results.store.push(...output);
  results.curr = output;

  return [page, results];
};

export const mergeWithStrategy: (
  base: object,
  strategy: RunStrategy<any>
) => PageAction = (base, strategy) => async ([page, results]) => {
  const html = await page.content();

  const output: object[] = strategy(html).map(merge(base));

  results.store.push(...output);
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

export const returnStore: (
  x: State<Page, ScrapeState>
) => Array<unknown> = compose(path([1, "store"]));

export const testContent: (
  fn: (x: string) => boolean
) => (x: State<Page, ScrapeState>) => Promise<boolean> = (fn) => async ([
  page,
  state,
]) => {
  const html = await page.content();

  return fn(html);
};

export const loop: Loop<ScrapeState> = (condition, next) => async (ctx) => {
  if (await condition(ctx)) {
    return Promise.resolve(ctx)
      .then(next)
      .then(loop(condition, next));
  }

  return Promise.resolve(ctx).then(next);
};

export const waitForNewContent: PageAction = async ([page, state]) => {
  const { ref: selector } = state;
  if (selector === undefined) return [page, state];

  while (true) {
    const html = await page.content();
    if (!html.includes(selector)) {
      break;
    }
    await wait(100);
  }

  state.ref = undefined;
  await wait(50);
  return [page, state];
};
