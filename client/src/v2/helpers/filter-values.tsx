/**
 * Return a new object that is the subset of an existing object that matches `predicate`.
 *
 * Analogous to lodash's mapValues except for filtering.
 */
export function filterValues<Value>(
    obj: Record<string, Value>,
    predicate: (key: string, value: Value) => boolean,
): Record<string, Value> {
    return Object.fromEntries(
        Object.entries(obj).filter(([key, value]) => predicate(key, value)),
    );
}
