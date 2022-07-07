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
