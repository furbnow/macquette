import fc from 'fast-check';

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
