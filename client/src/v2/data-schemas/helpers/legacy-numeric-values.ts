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

export const coalesceEmptyString = <T, U>(val: T | '', default_: U) =>
    val === '' ? default_ : val;
