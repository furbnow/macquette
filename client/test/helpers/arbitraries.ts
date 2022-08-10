import fc from 'fast-check';
import { mapValues } from 'lodash';

export type FcInfer<ArbT> = ArbT extends fc.Arbitrary<infer T>
    ? T
    : ArbT extends (...args: unknown[]) => fc.Arbitrary<infer T>
    ? T
    : never;

export function merge<
    U extends Record<string, unknown>,
    V extends Record<string, unknown>,
>(arbU: fc.Arbitrary<U>, arbV: fc.Arbitrary<V>) {
    return fc.tuple(arbU, arbV).map(([uu, vv]) => ({
        ...uu,
        ...vv,
    }));
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
