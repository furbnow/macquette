type TypeGuard<T, U extends T> = (value: T) => value is U;

export const partition = <T, U extends T>(
    arr: T[],
    predicate: TypeGuard<T, U>,
): [U[], Exclude<T, U>[]] => {
    const trues: U[] = [];
    const falses: Exclude<T, U>[] = [];
    for (const elem of arr) {
        if (predicate(elem)) {
            trues.push(elem);
        } else {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            falses.push(elem as Exclude<T, U>);
        }
    }
    return [trues, falses];
};
