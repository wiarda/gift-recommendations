import cheerio from 'cheerio';
import { Strategy } from './strategies/types';

export type runStrategy<K> = (html: string, selector?: string) => K[]
type loadStrategy<K> = (x: Strategy<K>) => runStrategy<K>

export const loadStrategy: loadStrategy<any> = strategy => (html, selector = "body") => {
    const $ = cheerio.load(html);
    const results = [];

    $(selector).each(function (idx, el) {
        const result = {};

        for (const prop in strategy) {
            result[prop] = strategy[prop]($, el);
        }
        
        results.push(result);
    })

    return results;
}
