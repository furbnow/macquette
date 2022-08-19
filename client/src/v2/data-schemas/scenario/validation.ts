import { z } from 'zod';

const modelNamespace = z.enum(['floor u-value calculator']);
const valuePath = z.array(z.union([z.string(), z.number()]));
export type ValuePath = z.infer<typeof valuePath>;

export const requiredValueMissingErrorSchema = z.object({
    type: z.literal('required value missing error'),
    namespace: modelNamespace,
    path: valuePath,
});
export type RequiredValueMissingError = z.infer<typeof requiredValueMissingErrorSchema>;

export const valueRangeWarning = z.object({
    type: z.literal('value range warning'),
    namespace: modelNamespace,
    path: valuePath,
    value: z.number(),
    resolution: z.discriminatedUnion('type', [
        z.object({ type: z.literal('used as-is') }),
        z.object({ type: z.literal('clamped'), to: z.number() }),
    ]),
});
export type ValueRangeWarning = z.infer<typeof valueRangeWarning>;

export const zeroDivisionWarning = z.object({
    type: z.literal('zero division warning'),
    namespace: modelNamespace,
    path: valuePath,
    outputReplacedWith: z.number(),
});
export type ZeroDivisionWarning = z.infer<typeof zeroDivisionWarning>;

export const miscellaneousNonFiniteNumberWarning = z.object({
    type: z.literal('miscellaneous non-finite number'),
    namespace: modelNamespace,
    path: valuePath,
    outputReplacedWith: z.number(),
});
export type MiscellaneousNonFiniteNumberWarning = z.infer<
    typeof miscellaneousNonFiniteNumberWarning
>;
