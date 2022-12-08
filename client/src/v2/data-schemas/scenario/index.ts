import { z } from 'zod';

import { withOriginSchema } from '../helpers/with-origin';
import { applianceCarbonCoop } from './appliance-carbon-coop';
import { fabric } from './fabric';
import { householdSchema } from './household';
import { solarHotWaterSchema } from './solar-hot-water';
import {
    legacyBoolean,
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
        name: z.string(),
    }),
);

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

export const modelBehaviourVersionSchema = z.union([
    z.literal('legacy'),
    z.literal(1),
    z.literal(2),
]);
export type ModelBehaviourVersion = z.infer<typeof modelBehaviourVersionSchema>;

export const scenarioSchema = z
    .object({
        modelBehaviourVersion: modelBehaviourVersionSchema,
        created_from: z.string().optional(),
        scenario_name: z.union([
            z.string(),
            z.number().transform((val) => val.toString()),
        ]),
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
                structural_infiltration_from_test: numberWithNaN.nullable(),
                structural_infiltration: numberWithNaN.nullable(),
            })
            .partial(),
        num_of_floors_override: z.number(), // Used only in ventilation
        FEE: numberWithNaN.nullable(),
        total_cost: numberWithNaN.nullable(),
        annualco2: numberWithNaN.nullable(),
        totalWK: numberWithNaN.nullable(),
        kwhdpp: numberWithNaN.nullable(),
        kgco2perm2: numberWithNaN.nullable(),
        primary_energy_use_m2: numberWithNaN.nullable(),
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
                annualcost: numberWithNaN.nullable(),
            }),
        ),
        currentenergy: z
            .object({
                primaryenergy_annual_kwh: numberWithNaN,
                primaryenergy_annual_kwhm2: numberWithNaN.nullable(),
                total_co2m2: numberWithNaN.nullable(),
                total_cost: numberWithNaN,
                annual_net_cost: numberWithNaN.nullable(),
                energyuseperperson: numberWithNaN.nullable(),
                enduse_annual_kwh: stringyFloatSchema,
                use_by_fuel: z.record(
                    z.object({
                        annual_use: stringyFloatSchema,
                        annual_co2: numberWithNaN,
                        primaryenergy: numberWithNaN,
                        annualcost: numberWithNaN,
                    }),
                ),
                onsite_generation: legacyBoolean,
                generation: z
                    .object({
                        annual_CO2: numberWithNaN,
                        primaryenergy: numberWithNaN,
                        annual_savings: numberWithNaN,
                        annual_FIT_income: numberWithNaN,
                        annual_generation: numberWithNaN,
                        fraction_used_onsite: numberWithNaN,
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
