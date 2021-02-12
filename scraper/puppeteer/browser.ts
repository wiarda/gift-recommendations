import { Browser, Page, LaunchOptions } from "puppeteer";
const stealth = require("puppeteer-extra-plugin-stealth");
import puppeteer from "puppeteer-extra";

puppeteer.use(stealth());

const IGNORED_TYPES = [
  "image",
  "media",
  "font",
  "texttrack",
  "object",
  "beacon",
  "csp_report",
  "imageset",
];

const IGNORED_RESOURCES = [
  "quantserve",
  "adzerk",
  "doubleclick",
  "adition",
  "exelator",
  "sharethrough",
  "cdn.api.twitter",
  "google-analytics",
  "googletagmanager",
  "google",
  "fontawesome",
  "facebook",
  "analytics",
  "optimizely",
  "clicktale",
  "mixpanel",
  "zedo",
  "clicksor",
  "tiqcdn",
  "doubleclick",
  "ad-delivery",
];

export const browser = (options: LaunchOptions = {}): Promise<Browser> =>
  puppeteer.launch({
    headless: false,
    ignoreHTTPSErrors: true,
    ...options,
    // defaultViewport: { width: 1800, height: 1200 }
  });

export const configurePage = (page) => {
  page.setRequestInterception(true);
  page.on("request", (request) => {
    const uri = request._url.split("?")[0].split("#")[0];
    if (
      IGNORED_TYPES.indexOf(request.resourceType()) !== -1 ||
      IGNORED_RESOURCES.some((resource) => uri.indexOf(resource) !== -1)
    )
      return request.abort();

    request.continue();
  });
  page.setDefaultNavigationTimeout(0); // prevent closing of process because of page timeout
  return page;
};

export const newPage: (options?: LaunchOptions) => Promise<Page> = (
  options = {}
) =>
  browser(options)
    .then((x) => x.newPage())
    .then(configurePage);

export const addPage: (
  browser: Promise<Browser>,
  options?: LaunchOptions
) => Promise<Page> = (browser, options = {}) =>
  browser.then((x) => x.newPage()).then(configurePage);
