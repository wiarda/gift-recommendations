export const normalizeText: (string) => string = input => {
    if (typeof input !== 'string') return null;
    
    return input.replace(/\s+/g, " ").trim();
};

export const numberOrNA = (input: any): number | 'NA' => {
    const ans = parseFloat(input);
    return isNaN(ans) ? 'NA' : ans;
}

export const normalizeProductLink = (rawLink: string, domain: string = ""): string => {
    if (typeof rawLink !== 'string') return null;

    let link = rawLink;

    // if present, remove adsystem prefixes
    const lastLinkIdx = link.lastIndexOf('http');
    if (lastLinkIdx > 0) link = link.substr(lastLinkIdx, link.length);

    // strip queries
    link = link.split("?")[0];

    // if absent, prepend domain info
    if (link.charAt(0) === "/") link = domain + link;
    
    return link;
}