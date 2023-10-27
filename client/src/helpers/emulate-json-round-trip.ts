import { isIndexable } from './is-indexable';
import { safeIsArray } from './safe-is-array';

/** Deep-clone an object, emulating a JSON round-trip
 *
 * This function behaves the same way as JSON.parse(JSON.stringify(value)), but
 * is much faster.
 *
 * e.g., NaN and Infinity become null, -0 becomes 0, undefined object
 * properties are dropped, undefined array elements become null.
 */
export function emulateJsonRoundTrip(data: unknown): unknown {
  if (isIndexable(data)) {
    if ('toJSON' in data && safeIsFunction(data['toJSON'])) {
      return emulateJsonRoundTrip(data['toJSON']());
    }
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
    if (Number.isNaN(data) || Object.is(data, Infinity) || Object.is(data, -Infinity)) {
      return null;
    } else if (Object.is(data, -0)) {
      return 0;
    } else {
      return data;
    }
  } else {
    return data;
  }
}

function safeIsFunction(val: unknown): val is (...args: unknown[]) => unknown {
  return typeof val === 'function';
}
