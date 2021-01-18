import cheerio from 'cheerio';
import { normalizeText, numberOrNA } from './helpers';

interface product {
    asin: number,
    name: string,
    price: number | 'NA',
    rating: number | 'NA',
    reviewCount?: number | 'NA',
    link: string,
    thumbnail: string,
    srcset?: string,
    imgAlt?: string,
    isSponsored?: boolean,
};

export const searchQuery: (string) => string = query => `https://www.amazon.com/s?k=${query}`;

// 1-16-20: products have an asin attribute with a non-null value
const SELECTOR = `div[data-asin]:not([data-asin=""])`

const gatherName = ($, root): string => {
    const raw = $('span.a-truncate-full', root).text() ||
        $('h2 > a > span', root).html();

    return normalizeText(raw);
}
const gatherRating = ($, root): number | 'NA' => {
    const raw = $('span[data-rt]', root).prop('data-rt') ||
        $('span.a-icon-alt', root).text().split(" ")[0]

        return numberOrNA(raw);
}

const gatherReviewCount = ($, root): number | 'NA' => {
    const raw = $('span[data-rt]', root).text() || 
        $('span > a > span.a-size-base', root).text();
    
    return numberOrNA(raw);
}

const gatherPrice = ($, root): number | 'NA' => {
    const dollars = $('span.a-price-whole', root).text();
    const cents = $('span.a-price-fraction', root).text();

    return numberOrNA(`${dollars}${cents}`);
}

const normalizeProductLink = (rawLink: string): string => {
    if (typeof rawLink !== 'string') return null;

    let link = rawLink;
    // if present, remove adsystem prefix
    const lastLinkIdx = link.lastIndexOf('http');
    if (lastLinkIdx > 0) link = link.substr(lastLinkIdx, link.length);

    // strip queries
    link = link.split("?")[0];

    // if absent, prepend domain info
    if (link.charAt(0) === "/") link = "https://www.amazon.com" + link;
    
    return link;
}

export function extractProducts(html: string): product[] {
    const $ = cheerio.load(html);
    const results = [];

    $(SELECTOR).each(function (idx, el) {
        // grab asin, url, product name, and star rating
        const asin = $(el).prop('data-asin');
        const link = normalizeProductLink($('a', el).prop('href'));
        const name = gatherName($, el);
        const imgAlt = $('img', el).prop('alt');
        const rating = gatherRating($, el);
        const reviewCount = gatherReviewCount($, el);
        const thumbnail = $('img', el).prop('src');
        const srcset = $('img', el).prop('srcset');
        const isSponsored = imgAlt.indexOf('Sponsored Ad') !== -1;
        const price = gatherPrice($, el);

        const product: product = { asin, link, name, rating, price, thumbnail, reviewCount, srcset, imgAlt, isSponsored }

        results.push(product);
    });

    return results;
}
