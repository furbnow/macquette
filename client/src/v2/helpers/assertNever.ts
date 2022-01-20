/** Type-level assertion that the argument is never instantiated (i.e. that the
 * code is unreachable)
 *
 * Useful in explicit exhaustiveness checks at the end of functions, when
 * TypeScript is not clever enough to allow you to elide the final return
 * statement.
 */
export const assertNever = (val: never): never => {
    return val;
};
