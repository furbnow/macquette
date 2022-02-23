import fc from 'fast-check';
import { mapValues } from 'lodash';

export type FcInfer<ArbT> = ArbT extends fc.Arbitrary<infer T>
    ? T
    : ArbT extends (...args: unknown[]) => fc.Arbitrary<infer T>
    ? T
    : never;

export const merge = <
    U extends Record<string, unknown>,
    V extends Record<string, unknown>,
>(
    arbU: fc.Arbitrary<U>,
    arbV: fc.Arbitrary<V>,
) =>
    fc.tuple(arbU, arbV).map(([uu, vv]) => ({
        ...uu,
        ...vv,
    }));

export const arbFloat = (options: fc.FloatNextConstraints = {}) =>
    fc.float({ ...options, next: true });

export const fcOptional = <T>(arb: fc.Arbitrary<T>) => fc.option(arb, { nil: undefined });
export const fcNullable = <T>(arb: fc.Arbitrary<T>) => fc.option(arb, { nil: null });

export const fcPartialRecord = <T>(record: { [K in keyof T]: fc.Arbitrary<T[K]> }) => {
    return fc.record<T, { withDeletedKeys: true }>(record, { withDeletedKeys: true });
};

export function recordWith<T extends Record<string | symbol, fc.Arbitrary<unknown>>, W>(
    extra: fc.Arbitrary<W>,
    source: T,
): { [K in keyof T]: fc.Arbitrary<FcInfer<T[K]> | W> } {
    return mapValues(source, (val) => fc.oneof(val, extra));
}

export function fcEnum<Value>(...vals: Value[]): fc.Arbitrary<Value> {
    return fc.oneof(...vals.map((val) => fc.constant(val)));
}
