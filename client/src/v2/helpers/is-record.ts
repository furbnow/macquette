export const isRecord = (val: unknown): val is Record<string, unknown> => {
    return typeof val === 'object' && !Array.isArray(val) && val !== null;
};
