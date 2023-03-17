import fc from 'fast-check';
import { mapValues } from 'lodash';

import { NonEmptyArray } from '../../src/v2/helpers/non-empty-array';

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

export function arbFloat(options: fc.FloatNextConstraints = {}) {
    return fc.float({ ...options, next: true });
}

export function fcOptional<T>(arb: fc.Arbitrary<T>) {
    return fc.option(arb, { nil: undefined });
}
export function fcNullable<T>(arb: fc.Arbitrary<T>) {
    return fc.option(arb, { nil: null });
}

export function fcPartialRecord<T>(record: { [K in keyof T]: fc.Arbitrary<T[K]> }) {
    return fc.record<T, { withDeletedKeys: true }>(record, { withDeletedKeys: true });
}

export function recordWith<T extends Record<string | symbol, fc.Arbitrary<unknown>>, W>(
    extra: fc.Arbitrary<W>,
    source: T,
): { [K in keyof T]: fc.Arbitrary<FcInfer<T[K]> | W> } {
    return mapValues(source, (val) => fc.oneof(val, extra));
}

/** @deprecated use fc.constantFrom instead */
export function fcEnum<Value>(...vals: Value[]): fc.Arbitrary<Value> {
    return fc.constantFrom(...vals);
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
