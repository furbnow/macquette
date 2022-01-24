import { z } from 'zod';

export const stringyIntegerSchema = z.union([
    z.number(),
    z
        .string()
        .transform((s) => (s === '' ? null : parseInt(s)))
        .refine((n) => n === null || Number.isSafeInteger(n)),
]);

export const stringyFloatSchema = z.union([
    z.number(),
    z
        .string()
        .transform((s) => (s === '' ? null : parseFloat(s)))
        .refine((n) => n === null || Number.isFinite(n)),
]);
