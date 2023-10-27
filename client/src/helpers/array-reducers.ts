export function sum(arr: number[]): number {
  return arr.reduce((total, item) => total + item, 0);
}

export function product(arr: number[]): number {
  return arr.reduce((total, item) => total * item, 1);
}

export function mean(arr: number[]) {
  return sum(arr) / arr.length;
}
