export const findWithRest = <T>(arr: T[], pred: (val: T) => boolean): [T | null, T[]] => {
    const index = arr.findIndex(pred);
    if (index === -1) {
        return [null, arr];
    } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return [arr[index]!, [...arr.slice(0, index), ...arr.slice(index + 1)]];
    }
};
