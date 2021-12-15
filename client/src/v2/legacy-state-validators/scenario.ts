import { z } from 'zod';
import { Orientation } from '../model/enums/orientation';
import { fabric } from './fabric';
import { numberWithNaN, stringyFloatSchema, stringyIntegerSchema } from './numericValues';

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

const lacFuels = z.array(
    z.object({
        fuel: z.string(),
        fraction: z.number(),
    }),
);
const LAC = z
    .object({
        L: stringyIntegerSchema,
        LLE: stringyIntegerSchema,
        reduced_heat_gains_lighting: legacyBoolean,
        energy_efficient_appliances: legacyBoolean,
        energy_efficient_cooking: legacyBoolean,
        fuels_lighting: lacFuels,
        fuels_appliances: lacFuels,
        fuels_cooking: lacFuels,
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
        fuels: z.record(
            z.object({
                category: z.enum([
                    'Gas',
                    'Solid fuel',
                    'Generation',
                    'generation',
                    'Oil',
                    'Electricity',
                ]),
                standingcharge: stringyFloatSchema,
                fuelcost: stringyFloatSchema,
                co2factor: stringyFloatSchema,
                primaryenergyfactor: stringyFloatSchema,
            }),
        ),
        LAC_calculation_type: z.enum(['SAP', 'carboncoop_SAPlighting']),
        LAC,
        ventilation: z
            .object({
                // Inputs
                IVF: z.array(
                    z.object({
                        ventilation_rate: stringyFloatSchema,
                    }),
                ),
                air_permeability_test: legacyBoolean,
                air_permeability_value: stringyFloatSchema,
                dwelling_construction: z.enum(['timberframe', 'masonry']),
                suspended_wooden_floor: z.union([
                    z.literal(0),
                    z.enum(['sealed', 'unsealed']),
                ]),
                percentage_draught_proofed: z.number(),
                draught_lobby: legacyBoolean,
                number_of_sides_sheltered: z.number(),
                ventilation_type: z.enum(['NV', 'IE', 'MEV', 'PS', 'MVHR', 'MV', 'DEV']),
                EVP: z.array(z.object({ ventilation_rate: stringyFloatSchema })),
                system_air_change_rate: z.union([
                    z.literal('na').transform(() => null),
                    z.literal('n/a').transform(() => null),
                    stringyFloatSchema,
                ]),
                balanced_heat_recovery_efficiency: z.union([
                    z.literal('na').transform(() => null),
                    z.literal('n/a').transform(() => null),
                    stringyFloatSchema,
                ]),

                // Outputs
                // Only one of the structural_infiltration values is relevant,
                // depending on the value of air_permeability_test
                structural_infiltration_from_test: numberWithNaN.nullable(),
                structural_infiltration: numberWithNaN.nullable(),
            })
            .partial(),
        num_of_floors_override: z.number(), // Used only in ventilation
    })
    .partial();

export type LegacyScenario = z.infer<typeof legacyScenarioSchema>;
