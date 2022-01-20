export const zip = <U, V>(us: U[], vs: V[]): Array<[U, V]> => {
    const out: [U, V][] = [];
    const minLength = Math.min(us.length, vs.length);
    for (let idx = 0; idx < minLength; idx++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        out.push([us[idx]!, vs[idx]!]);
    }
    return out;
};
