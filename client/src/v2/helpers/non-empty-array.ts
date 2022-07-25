export type NonEmptyArray<T> = [T, ...T[]];

export function isNonEmpty<T>(value: T[]): value is NonEmptyArray<T> {
    return value.length > 0;
}

export function assertNonEmpty<T>(value: T[]): NonEmptyArray<T> {
    if (isNonEmpty(value)) {
        return value;
    } else {
        throw new Error('Attempted to assert that an empty array was non-empty');
    }
}

export function mapNonEmpty<T, U>(
    arr: NonEmptyArray<T>,
    fn: (val: T, index: number) => U,
): NonEmptyArray<U> {
    return assertNonEmpty(arr.map(fn));
}

export function first<T>(vals: NonEmptyArray<T>): T {
    return vals[0];
}

export function last<T>(vals: NonEmptyArray<T>): T {
    // SAFETY: If vals is non-empty, it must have a last element
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return vals[vals.length - 1]!;
}
