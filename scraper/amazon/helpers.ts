export const normalizeText: (string) => string = input => {
    if (typeof input !== 'string') return null;
    
    return input.replace(/\s+/g, " ").trim();
};

export const numberOrNA = (input: any): number | 'NA' => {
    const ans = parseFloat(input);
    return isNaN(ans) ? 'NA' : ans;
}