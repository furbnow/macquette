export function sum(arr: number[]): number {
    return arr.reduce((total, item) => total + item, 0);
}
