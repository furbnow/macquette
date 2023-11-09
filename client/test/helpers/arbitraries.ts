import fc from 'fast-check';

import { NonEmptyArray } from '../../src/helpers/non-empty-array';

export type FcInfer<ArbT> = ArbT extends fc.Arbitrary<infer T>
  ? T
  : ArbT extends (...args: unknown[]) => fc.Arbitrary<infer T>
  ? T
  : never;

/** Recursively compute the intersection of a set of types */
type Intersection<Ts> = Ts extends []
  ? unknown
  : Ts extends [infer T, ...infer Rest]
  ? T & Intersection<Rest>
  : never;

export function merge<Ts extends Record<string, unknown>[]>(
  ...arbs: { [K in keyof Ts]: fc.Arbitrary<Ts[K]> }
): fc.Arbitrary<Intersection<Ts>> {
  return fc.tuple<Ts>(...arbs).map((vals) => {
    // SAFETY: Intersection<Ts> intersects its parameter types, and
    // Object.assign merges its parameter objects. This cast is therefore
    // sound as long as none of the keys overlap.

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const merged: Intersection<Ts> = Object.assign({}, ...vals);
    return merged;
  });
}

/** @deprecated use fc.float instead */
export function arbFloat(options: fc.FloatConstraints = {}) {
  return fc.float(options);
}

export function arbDateOrRFC3339(): fc.Arbitrary<string | Date> {
  return fc
    .tuple(
      fc.boolean(),
      fc.date({
        min: new Date('0000-01-01T00:00:00Z'),
        max: new Date('9999-12-31T23:59:59.999Z'),
      }),
    )
    .map(([stringify, date]) => (stringify ? date.toISOString() : date));
}

export function fcNonEmptyArray<T>(
  arb: fc.Arbitrary<T>,
  options: Omit<fc.ArrayConstraints, 'minLength'> = {},
): fc.Arbitrary<NonEmptyArray<T>> {
  return (
    fc
      .array(arb, { ...options, minLength: 1 })
      // SAFETY: We passed minLength: 1
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      .map((arr: T[]) => arr as NonEmptyArray<T>)
  );
}
