import { z } from 'zod';

import { withOriginSchema } from '../helpers/with-origin';
import { applianceCarbonCoop } from './appliance-carbon-coop';
import { fabric } from './fabric';
import { householdSchema } from './household';
import { solarHotWaterSchema } from './solar-hot-water';
import {
    legacyBoolean,
    legacyString,
    nullableStringyFloat,
    numberWithNaN,
    stringyFloatSchema,
    stringyIntegerSchema,
} from './value-schemas';
import { heatingSystems, waterHeating } from './water-heating';

const floors = z.array(
    z.object({
        area: stringyFloatSchema,
        height: stringyFloatSchema,
        name: legacyString,
    }),
);

const lacFuels = z.array(
    z.object({
        fuel: legacyString,
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

export const modelBehaviourVersionSchema = z.union([
    z.literal('legacy'),
    z.literal(1),
    z.literal(2),
    z.literal(3),
]);
export type ModelBehaviourVersion = z.infer<typeof modelBehaviourVersionSchema>;

export const scenarioSchema = z
    .object({
        modelBehaviourVersion: modelBehaviourVersionSchema,
        created_from: legacyString.optional(),
        scenario_name: legacyString,
        creation_hash: z.number().optional(),
        sidebarExpanded: z.boolean().optional(),
        floors,
        use_custom_occupancy: legacyBoolean,
        custom_occupancy: z.union([z.number(), z.literal('')]),
        region: z.number(),
        region_full: withOriginSchema(z.number(), z.null()),
        fabric,
        water_heating: waterHeating,
        SHW: solarHotWaterSchema,
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
                percentage_draught_proofed: stringyFloatSchema,
                draught_lobby: legacyBoolean,
                number_of_sides_sheltered: z.number(),
                ventilation_type: z.enum(['NV', 'IE', 'MEV', 'PS', 'MVHR', 'MV', 'DEV']),
                EVP: z.array(z.object({ ventilation_rate: stringyFloatSchema })),
                system_air_change_rate: nullableStringyFloat,
                balanced_heat_recovery_efficiency: nullableStringyFloat,

                // Outputs
                // Only one of the structural_infiltration values is relevant,
                // depending on the value of air_permeability_test
                structural_infiltration_from_test: numberWithNaN,
                structural_infiltration: numberWithNaN,
            })
            .partial(),
        num_of_floors_override: z.number(), // Used only in ventilation
        FEE: numberWithNaN,
        total_cost: numberWithNaN,
        annualco2: numberWithNaN,
        totalWK: numberWithNaN,
        kwhdpp: numberWithNaN,
        kgco2perm2: numberWithNaN,
        primary_energy_use_m2: numberWithNaN,
        TFA: stringyFloatSchema,
        fuel_requirements: z.record(
            z.object({
                quantity: numberWithNaN,
            }),
        ),
        temperature: z
            .object({
                target: z.number(),
            })
            .partial(),
        fuel_totals: z.record(
            z.object({
                name: legacyString,
                quantity: z.number().nullable(),
                annualcost: numberWithNaN,
            }),
        ),
        currentenergy: z
            .object({
                primaryenergy_annual_kwh: numberWithNaN,
                total_co2: numberWithNaN,
                total_cost: numberWithNaN,
                annual_net_cost: numberWithNaN,
                enduse_annual_kwh: stringyFloatSchema,
                use_by_fuel: z.record(
                    z.object({
                        annual_use: stringyFloatSchema,
                        annual_co2: numberWithNaN.optional(),
                        primaryenergy: numberWithNaN.optional(),
                        annualcost: numberWithNaN.optional(),
                    }),
                ),

                // Not legacyBoolean because legacy model uses a "=== 1" check on this value
                onsite_generation: z.union([z.literal(1), z.literal(false)]),

                generation: z
                    .object({
                        annual_CO2: numberWithNaN,
                        primaryenergy: numberWithNaN,
                        annual_savings: numberWithNaN,
                        annual_FIT_income: stringyFloatSchema,
                        annual_generation: stringyFloatSchema,
                        fraction_used_onsite: stringyFloatSchema,
                    })
                    .partial(),
            })
            .partial(),
        space_heating: z
            .object({
                annual_heating_demand_m2: numberWithNaN,
            })
            .partial(),
        space_heating_demand_m2: numberWithNaN,
        annual_useful_gains_kWh_m2: z
            .object({
                Solar: numberWithNaN,
                Internal: numberWithNaN,
            })
            .partial(),
        annual_losses_kWh_m2: z
            .object({
                fabric: numberWithNaN,
                ventilation: numberWithNaN,
                infiltration: numberWithNaN,
            })
            .partial(),
        heating_systems: heatingSystems,
        applianceCarbonCoop: applianceCarbonCoop,
        model: z.unknown(),
        generation: z
            .object({
                solar_annual_kwh: stringyFloatSchema,
                solar_fraction_used_onsite: stringyFloatSchema,
                solar_FIT: stringyFloatSchema,
                solar_export_FIT: stringyFloatSchema,
                wind_annual_kwh: stringyFloatSchema,
                wind_fraction_used_onsite: stringyFloatSchema,
                wind_FIT: stringyFloatSchema,
                wind_export_FIT: stringyFloatSchema,
                hydro_annual_kwh: stringyFloatSchema,
                hydro_fraction_used_onsite: stringyFloatSchema,
                hydro_FIT: stringyFloatSchema,
                hydro_export_FIT: stringyFloatSchema,
            })
            .partial()
            .extend({
                use_PV_calculator: legacyBoolean,
                solarpv_kwp_installed: stringyFloatSchema,
                solarpv_orientation: stringyIntegerSchema,
                solarpv_inclination: stringyFloatSchema,
                solarpv_overshading: stringyFloatSchema,
            }),
        altitude: stringyFloatSchema,
        altitude_full: withOriginSchema(z.number(), z.null()),
        household: householdSchema.partial(),
    })
    .partial()
    .optional();

export type Scenario = z.infer<typeof scenarioSchema>;
