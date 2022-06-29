export type ComparisonResult<T> = {
    onlyLHS: Set<T>;
    intersection: Set<T>;
    onlyRHS: Set<T>;
};

export function compareSets<T>(lhs: Set<T>, rhs: Set<T>): ComparisonResult<T> {
    const onlyLHS: Set<T> = new Set();
    const intersection: Set<T> = new Set();
    const onlyRHS: Set<T> = new Set();
    for (const elem of lhs) {
        if (rhs.has(elem)) {
            intersection.add(elem);
        } else {
            onlyLHS.add(elem);
        }
    }
    for (const elem of rhs) {
        if (!lhs.has(elem)) {
            onlyRHS.add(elem);
        }
    }
    return { onlyLHS, intersection, onlyRHS };
}
