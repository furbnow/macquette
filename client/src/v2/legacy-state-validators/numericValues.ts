import inspect from 'object-inspect';
import { z } from 'zod';

export const stringyIntegerSchema = z.union([
    z.number(),
    z
        .string()
        .transform((s) => (s === '' ? null : parseFloat(s)))
        .refine(
            (n) => n === null || Number.isSafeInteger(n),

            (n) => ({
                message: `${n?.toString(10) ?? 'null'} was not a safe integer`,
            }),
        ),
]);

export const stringyFloatSchema = z.union([
    z.number(),
    z
        .string()
        .transform((s) => (s === '' ? null : parseFloat(s)))
        .refine(
            (n) => n === null || Number.isFinite(n),
            (n) => ({
                message: `${n?.toString(10) ?? 'null'} was not finite`,
            }),
        ),
]);

export const numberWithNaN = z.custom<number>(
    (val) => typeof val === 'number',
    (val) => ({ message: `Expected number (including NaN), received ${inspect(val)}` }),
);
