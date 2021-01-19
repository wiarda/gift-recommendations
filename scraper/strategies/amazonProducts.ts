import { normalizeText, numberOrNA, normalizeProductLink } from './utils';
import { Strategy } from './types';

// As of 1-16-20: products have a unique asin attribute with a non-null value
export const productsSelector = `div[data-asin]:not([data-asin=""])`

export type Product = {
    asin: number,
    name: string,
    price: number | 'NA',
    link: string,
    thumbnail: string,
    rating: number | 'NA',
    reviewCount?: number | 'NA',
    srcset?: string,
    imgAlt?: string,
    isSponsored?: boolean,
};

export const amazonProductStrategy: Strategy<Product> = {
    asin: ($, root) => $(root).prop('data-asin'),
    name: ($, root) => {
        const raw = $('span.a-truncate-full', root).text() ||
            $('h2 > a > span', root).html();

        return normalizeText(raw);
    },
    price: ($, root): number | 'NA' => {
        const dollars = $('span.a-price-whole', root).text();
        const cents = $('span.a-price-fraction', root).text();

        return numberOrNA(`${dollars}${cents}`);
    },
    link: ($, root) => normalizeProductLink($('a', root).prop('href'), "https://https://www.amazon.com/"),
    thumbnail: ($, root) => $('img', root).prop('src'),
    rating: ($, root) => {
        const raw = $('span[data-rt]', root).prop('data-rt') ||
            $('span.a-icon-alt', root).text().split(" ")[0]

        return numberOrNA(raw);
    },
    reviewCount: ($, root) => {
        const raw = $('span[data-rt]', root).text() ||
            $('span > a > span.a-size-base', root).text();

        return numberOrNA(raw);
    },
    srcset: ($, root) => $('img', root).prop('srcset'),
    imgAlt: ($, root) => $('img', root).prop('alt'),
    isSponsored: ($, root) => $('img', root).prop('alt').indexOf('Sponsored Ad') !== -1,
}
