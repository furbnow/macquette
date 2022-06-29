import inspect from 'object-inspect';
import { z } from 'zod';

export const stringyIntegerSchema = z.union([
    z.number(),
    z
        .string()
        .transform((s) => (s === '' ? ('' as const) : parseFloat(s)))
        .refine(
            (n) => n === '' || Number.isSafeInteger(n),

            (n) => ({
                message: `${n?.toString(10) ?? 'empty string'} was not a safe integer`,
            }),
        ),
]);

export const stringyFloatSchema = z.union([
    z.number(),
    z
        .string()
        .transform((s) => (s === '' ? ('' as const) : parseFloat(s)))
        .refine(
            (n) => n === '' || Number.isFinite(n),
            (n) => ({
                message: `${n?.toString(10) ?? 'empty string'} was not finite`,
            }),
        ),
]);

export const numberWithNaN = z.custom<number>(
    (val) => typeof val === 'number',
    (val) => ({ message: `Expected number (including NaN), received ${inspect(val)}` }),
);

export const nullableStringyFloat = z.union([
    z.literal(null),
    z.literal('null').transform(() => null),
    z.literal('na').transform(() => null),
    z.literal('n/a').transform(() => null),
    stringyFloatSchema,
]);

export function coalesceEmptyString<T, U>(val: T | '', default_: U) {
    return val === '' ? default_ : val;
}

export const legacyBoolean = z.union([
    z.boolean(),
    z.literal(1).transform(() => true),
    z.literal('1').transform(() => true),
    z.literal('').transform(() => false),
    z.literal('true').transform(() => true),
    z.literal('false').transform(() => false),
]);
