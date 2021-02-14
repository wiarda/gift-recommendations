import cheerio from "cheerio";
import { invoker, compose } from "ramda";

/** PIPELINE UTILS */

export const select = (selector: string) => (
  $: cheerio.Root,
  domRoot: cheerio.Element
) => $(selector, domRoot);

export const lift$ = cheerio;

export function invoke(methodName: string, arg?: unknown) {
  const args = Array.from(arguments).slice(1);
  const arity = args.length;

  return arity
    ? invoker(arity, methodName)(...args)
    : invoker(arity, methodName);
}

/** ## CHEERIO / DOM MANIPULATION TOOLS ## */

export const $prop = (selector: string, propName: string) =>
  compose(invoke("prop", propName), select(selector));

export const $text = (selector: string) =>
  compose(invoke("text"), select(selector));

export const $html = (selector: string) =>
  compose(invoke("html"), select(selector));

export const nthNode = (n: number) => compose(lift$, invoke("get", n));

export const search = (selector: string) => (selection: cheerio.Cheerio) =>
  cheerio(selector, selection);

/**
 * Enter a Cheerio [] selection with an idx
 */
export const get = (idx: number) => (
  $: cheerio.Root,
  domRoot: cheerio.Element
) => $(domRoot).get(idx);

export const fromStrategy = ($: cheerio.Root, domRoot: cheerio.Element) =>
  $(domRoot);

/** ## TEXT PARSING UTILS ## */

export const normalizeText: (string) => string = (input) => {
  if (typeof input !== "string") return null;

  return input.replace(/\s+/g, " ").trim();
};

export const numberOrNA = (input: any): number | "NA" => {
  const ans = normalizeNumber(input);
  return isNaN(ans) ? "NA" : ans;
};

export const normalizeProductLink = (
  rawLink: string,
  domain: string = ""
): string => {
  if (typeof rawLink !== "string") return null;

  let link = rawLink;

  // if present, remove adsystem prefixes
  const lastLinkIdx = link.lastIndexOf("http");
  if (lastLinkIdx > 0) link = link.substr(lastLinkIdx, link.length);

  // strip queries
  link = link.split("?")[0];

  // if absent, prepend domain info
  if (link.charAt(0) === "/") link = domain + link;

  return link;
};

export const normalizeNumber: (x: string) => number = (x) => {
  return parseFloat(x.replace(/[,a-zA-Z]/g, ""));
};
