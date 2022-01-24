import { z } from 'zod';
import { fabric } from './fabric';

const floors = z
    .array(
        z.object({
            area: z.union([z.number(), z.literal('').transform(() => 0)]),
            height: z.union([z.number(), z.literal('').transform(() => 0)]),
            name: z.string(),
        }),
    )
    .optional();

export const legacyScenarioSchema = z.object({
    floors,
    use_custom_occupancy: z.union([z.number(), z.boolean()]).optional(),
    custom_occupancy: z.union([z.number(), z.literal('')]).optional(),
    region: z.number().optional(),
    fabric,
});

export type LegacyScenario = z.infer<typeof legacyScenarioSchema>;
