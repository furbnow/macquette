/** Check if the value can be indexed by strings. Note that this function will
 * return true even when the input object has a prototype chain, whereas
 * TypeScript's `... extends Record<string, unknown>` check will generally be
 * false for ES6 classes.
 *
 * For example:
 *
 * ```
 * class Foo {}
 * type FooExtendsRecord = Foo extends Record<string, unknown> ? true : false;
 * // => type resolves to false
 * isIndexable(new Foo())
 * // => expression evaluates to true
 * ```
 */
export function isIndexable(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}
