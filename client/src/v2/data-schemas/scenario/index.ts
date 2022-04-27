import { z } from 'zod';

import {
    nullableStringyFloat,
    numberWithNaN,
    stringyFloatSchema,
    stringyIntegerSchema,
} from '../helpers/legacy-numeric-values';
import { fabric } from './fabric';
import { solarHotWater } from './solar-hot-water';

const legacyBoolean = z.union([z.literal(1).transform(() => true), z.boolean()]);

const floors = z.array(
    z.object({
        area: z.union([z.number(), z.literal('').transform(() => 0)]),
        height: z.union([z.number(), z.literal('').transform(() => 0)]),
        name: z.string(),
    }),
);

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

export const scenarioSchema = z
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
                system_air_change_rate: nullableStringyFloat,
                balanced_heat_recovery_efficiency: nullableStringyFloat,

                // Outputs
                // Only one of the structural_infiltration values is relevant,
                // depending on the value of air_permeability_test
                structural_infiltration_from_test: numberWithNaN.nullable(),
                structural_infiltration: numberWithNaN.nullable(),
            })
            .partial(),
        num_of_floors_override: z.number(), // Used only in ventilation
        FEE: numberWithNaN.nullable(),
        total_cost: stringyFloatSchema.nullable(),
        annualco2: z.number().nullable(),
        totalWK: numberWithNaN.nullable(),
        TFA: stringyFloatSchema,
        fuel_requirements: z.record(
            z.object({
                quantity: numberWithNaN.nullable(),
            }),
        ),
        temperature: z
            .object({
                target: z.number(),
            })
            .partial(),
        fuel_totals: z.record(
            z.object({
                name: z.string(),
                quantity: z.number().nullable(),
                annualcost: stringyFloatSchema.nullable(),
            }),
        ),
        currentenergy: z
            .object({
                total_cost: numberWithNaN,
                enduse_annual_kwh: stringyFloatSchema,
                use_by_fuel: z.record(
                    z.object({
                        annual_use: stringyFloatSchema,
                    }),
                ),
                generation: z
                    .object({
                        fraction_used_onsite: numberWithNaN,
                        annual_generation: numberWithNaN,
                        annual_savings: numberWithNaN,
                    })
                    .partial(),
            })
            .partial(),
        space_heating: z
            .object({
                annual_heating_demand_m2: numberWithNaN.nullable(),
            })
            .partial(),
        space_heating_demand_m2: numberWithNaN.nullable(),
        annual_useful_gains_kWh_m2: z
            .object({
                Solar: numberWithNaN.nullable(),
                Internal: numberWithNaN.nullable(),
            })
            .partial(),
        annual_losses_kWh_m2: z
            .object({
                fabric: numberWithNaN.nullable(),
                ventilation: numberWithNaN.nullable(),
                infiltration: numberWithNaN.nullable(),
            })
            .partial(),
    })
    .partial();

export type Scenario = z.infer<typeof scenarioSchema>;
