import { z } from 'zod';
import { stringyFloatSchema } from '../../../data-schemas/scenario/value-schemas';
import { Orientation } from '../../../model/enums/orientation';

export const shwLegacy = z
    .object({
        pump: z.enum(['PV', 'electric']),
        A: z.number(),
        n0: z.number(), // η != n 😠
        a1: stringyFloatSchema,
        a2: stringyFloatSchema,
        orientation: z.number().int().gte(0).lt(Orientation.names.length),
        inclination: z.number(),
        overshading: z.number(),
        Vs: z.number(),
        combined_cylinder_volume: z.number(),
    })
    .partial();

export type SolarHotWaterLegacy = z.infer<typeof shwLegacy>;
