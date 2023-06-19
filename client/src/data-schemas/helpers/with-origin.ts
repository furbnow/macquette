import { z } from 'zod';

export function withOriginSchema<Value, NoValue>(
    valueSchema: z.ZodType<Value, z.ZodTypeDef, Value>,
    noValueSchema: z.ZodType<NoValue, z.ZodTypeDef, NoValue>,
) {
    return z.discriminatedUnion('type', [
        z.object({ type: z.literal('no data') }),
        z.object({
            type: z.literal('user provided'),
            value: z.union([valueSchema, noValueSchema]),
        }),
        z.object({ type: z.literal('from database'), value: valueSchema }),
        z.object({
            type: z.literal('overridden'),
            value: z.union([valueSchema, noValueSchema]),
            dbValue: valueSchema,
        }),
    ]);
}
