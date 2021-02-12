import { Browser, Page } from "puppeteer";
import { compose, invoker, head } from "ramda";
import { browser, configurePage } from "../puppeteer/browser";

export const chrome = browser();
export const firstTab: (browser: Browser) => Promise<Page> = compose(
  invoker(0, "page"),
  head,
  invoker(0, "targets")
);

export const page: Promise<Page> = chrome
  .then(firstTab)
  .then(configurePage);
