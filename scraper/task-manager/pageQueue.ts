import { Page, LaunchOptions, Browser } from "puppeteer";
import { PageQueue } from "./types";
import {
  browser as createBrowser,
  addPage,
  configurePage,
} from "../puppeteer/browser";
import { firstTab } from "../puppeteer/index";

// fix-sized queue that cycles around an array
function Queue(size: number = 20) {
  this.queue = new Array(size);
  this.size = size;
  this.count = 0;
  this.enterIdx = 0;
  this.exitIdx = 0;
}

Object.assign(Queue.prototype, {
  enqueue: function (el) {
    if (this.count > this.size) {
      throw new Error("Exceeded queue size.");
    }

    this.queue[this.enterIdx++] = el;
    if (this.enterIdx == this.size) this.enterIdx = 0;
    this.count++;
  },
  dequeue: function () {
    if (this.count === 0) return null;

    const result = this.queue[this.exitIdx++];

    if (this.exitIdx === this.size) this.exitIdx = 0;
    this.count--;
    return result;
  },
});

export function PageQueue(
  size: number = 20,
  browser?: Promise<Browser>,
  browserOptions?: LaunchOptions
): PageQueue {
  const pageQueue = new Queue(size);
  if (!browser) browser = createBrowser(browserOptions || {});

  // browser intializes with one page
  const firstPage = browser.then(firstTab).then(configurePage);
  pageQueue.enqueue(firstPage);

  for (let i = 1; i < size; ++i) {
    pageQueue.enqueue(addPage(browser));
  }

  return pageQueue;
}

export const wait: (duration: number) => Promise<void> = (duration) =>
  new Promise((res) => {
    setTimeout(res, duration);
  });

export const checkin: (
  page: Promise<Page>,
  queue: PageQueue
) => (x: unknown) => unknown = (page, pageQueue) => (x) => {
  pageQueue.enqueue(page);
  return x;
};
