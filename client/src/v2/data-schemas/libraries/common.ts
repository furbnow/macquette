import { z } from 'zod';

import { libraryCommonMetadataSchema } from '../api-metadata';
import { stringyIntegerSchema } from '../helpers/legacy-numeric-values';

export const measureCommonSchema = z.object({
    associated_work: z.string(),
    benefits: z.string(),
    cost_units: z.string(),
    cost: stringyIntegerSchema,
    description: z.string(),
    disruption: z.string(),
    key_risks: z.string(),
    maintenance: z.string(),
    notes: z.string(),
    performance: z.string(),
    who_by: z.string(),
});

export const libraryItemCommonSchema = z.object({
    tag: z.string().optional(),
    name: z.string(),
});

export const withGenericTags = z.object({
    tags: z.array(z.string().nullable()).optional(),
});

export function makeLibrarySchema<Type extends string, ItemT>(
    type: Type,
    itemSchema: z.ZodSchema<ItemT>,
) {
    return z
        .object({
            type: z.literal(type),
            data: z.record(itemSchema),
        })
        .merge(libraryCommonMetadataSchema);
}
