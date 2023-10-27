import { z } from 'zod';

import { stringyIntegerSchema } from '../scenario/value-schemas';

export const measureCommonSchema = z.object({
  associated_work: z.string(),
  benefits: z.string(),
  cost: stringyIntegerSchema,
  cost_units: z.string(),
  min_cost: stringyIntegerSchema.optional(),
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
  itemSchema: z.ZodType<ItemT, z.ZodTypeDef, unknown>,
) {
  return z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal(type),
    data: z.record(itemSchema),
  });
}
