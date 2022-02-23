/** Deep-clone an object, emulating a JSON round-trip
 *
 * This function behaves the same way as JSON.parse(JSON.stringify(value)), but
 * is much faster.
 *
 * e.g., NaN and Infinity become null, -0 becomes 0, undefined object
 * properties are dropped, undefined array elements become null.
 */
export const emulateJsonRoundTrip = (data: unknown): unknown => {
    if (isRecord(data)) {
        const out: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(data)) {
            if (val !== undefined) {
                out[key] = emulateJsonRoundTrip(val);
            }
        }
        return out;
    } else if (safeIsArray(data)) {
        return data.map((element) => {
            if (element === undefined) {
                return null;
            } else {
                return emulateJsonRoundTrip(element);
            }
        });
    } else if (typeof data === 'number') {
        if (
            Number.isNaN(data) ||
            Object.is(data, Infinity) ||
            Object.is(data, -Infinity)
        ) {
            return null;
        } else if (Object.is(data, -0)) {
            return 0;
        } else {
            return data;
        }
    } else {
        return data;
    }
};

const isRecord = (val: unknown): val is Record<string, unknown> => {
    return typeof val === 'object' && !Array.isArray(val) && val !== null;
};

const safeIsArray = (val: unknown): val is Array<unknown> => {
    return Array.isArray(val);
};
