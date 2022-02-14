import { z } from 'zod';
import { Orientation } from '../model/enums/orientation';
import { fabric } from './fabric';
import { numberWithNaN, stringyFloatSchema } from './numericValues';

const legacyBoolean = z.union([z.literal(1).transform(() => true), z.boolean()]);

const floors = z.array(
    z.object({
        area: z.union([z.number(), z.literal('').transform(() => 0)]),
        height: z.union([z.number(), z.literal('').transform(() => 0)]),
        name: z.string(),
    }),
);

const solarHotWater = z
    .object({
        // Model outputs
        a: numberWithNaN.nullable(),
        collector_performance_ratio: numberWithNaN.nullable(),
        annual_solar: numberWithNaN.nullable(),
        solar_energy_available: numberWithNaN.nullable(),
        solar_load_ratio: numberWithNaN.nullable(),
        utilisation_factor: z.number(),
        collector_performance_factor: numberWithNaN.nullable(),
        Veff: numberWithNaN.nullable(),
        volume_ratio: numberWithNaN.nullable(),
        f2: numberWithNaN.nullable(),
        Qs: z.number().nullable(),

        // Model inputs
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

const waterHeating = z
    .object({
        annual_energy_content: z.number(),
        Vd_average: z.number(),
        low_water_use_design: z.union([z.literal(1), z.boolean()]),
        override_annual_energy_content: z.union([z.literal(1), z.boolean()]),
        solar_water_heating: z.union([z.literal(1), z.boolean()]),
    })
    .partial();

export const legacyScenarioSchema = z
    .object({
        floors,
        use_custom_occupancy: legacyBoolean,
        custom_occupancy: z.union([z.number(), z.literal('')]),
        region: z.number(),
        fabric,
        water_heating: waterHeating,
        SHW: solarHotWater,
        use_SHW: legacyBoolean,
        locked: z.boolean(),
    })
    .partial();

export type LegacyScenario = z.infer<typeof legacyScenarioSchema>;
