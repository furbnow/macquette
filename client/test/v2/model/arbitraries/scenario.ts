import fc from 'fast-check';
import { solarHotWaterOvershadingFactor } from '../../../../src/v2/model/datasets';
import { Orientation } from '../../../../src/v2/model/enums/orientation';
import { Overshading } from '../../../../src/v2/model/enums/overshading';
import { Region } from '../../../../src/v2/model/enums/region';
import { fcPartialRecord } from '../../../helpers/arbitraries';
import {
    legacyBoolean,
    sensibleFloat,
    stringyInteger,
    stringySensibleFloat,
} from './values';
import { arbFabric } from './fabric';
import { pick } from 'lodash';

const arbOvershading = fc
    .oneof(...Overshading.names.map((n) => fc.constant(n)))
    .map((n) => new Overshading(n));

const arbFloors = () =>
    fc.array(
        fc.record({
            area: fc.oneof(sensibleFloat, fc.constant('')),
            height: fc.oneof(sensibleFloat, fc.constant('')),
            name: fc.string(),
        }),
    );

const arbFuels = () =>
    fc.dictionary(
        fc.string(),
        fc.record({
            category: fc.oneof(
                ...[
                    'Gas',
                    'Solid fuel',
                    'Generation',
                    'generation',
                    'Oil',
                    'Electricity',
                ].map(fc.constant),
            ),
            standingcharge: stringySensibleFloat(),
            fuelcost: stringySensibleFloat(),
            co2factor: stringySensibleFloat(),
            primaryenergyfactor: stringySensibleFloat(),
        }),
    );

const arbLAC_calculation_type = () =>
    fc.oneof(...(['SAP', 'carboncoop_SAPlighting'] as const).map(fc.constant));

const arbLACFuels = (fuelNames: string[]) =>
    fc.subarray(fuelNames).chain((sub) =>
        fc.tuple(
            ...sub.map((fuelName) =>
                fc.record({
                    fuel: fc.constant(fuelName),
                    fraction: fc.double({
                        next: true,
                        noNaN: true,
                        min: 1e-7,
                        max: 1,
                    }),
                }),
            ),
        ),
    );

const arbLAC = (fuelNames: string[]) =>
    fcPartialRecord({
        L: stringyInteger(),
        LLE: stringyInteger(),
        reduced_heat_gains_lighting: legacyBoolean(),
        energy_efficient_appliances: legacyBoolean(),
        energy_efficient_cooking: legacyBoolean(),
        fuels_lighting: arbLACFuels(fuelNames),
        fuels_appliances: arbLACFuels(fuelNames),
        fuels_cooking: arbLACFuels(fuelNames),
    });

export const arbScenario = () =>
    arbFuels()
        .chain((fuels) =>
            fcPartialRecord({
                fuels: fc.constant(fuels),
                floors: arbFloors(),
                use_custom_occupancy: legacyBoolean(),
                custom_occupancy: fc.oneof(sensibleFloat, fc.constant('')),
                region: fc.integer({ min: 0, max: Region.names.length - 1 }),
                fabric: arbFabric(),
                water_heating: fcPartialRecord({
                    low_water_use_design: fc.oneof(fc.boolean(), fc.constant(1)),
                    annual_energy_content: sensibleFloat,
                    override_annual_energy_content: fc.oneof(
                        fc.boolean(),
                        fc.constant(1),
                    ),
                    solar_water_heating: fc.oneof(fc.boolean(), fc.constant(1)),
                }),
                SHW: fc.record({
                    pump: fc.oneof(fc.constant('PV'), fc.constant('electric')),
                    A: sensibleFloat,
                    n0: sensibleFloat,
                    a1: stringySensibleFloat(),
                    a2: stringySensibleFloat(),
                    orientation: fc.integer({
                        min: 0,
                        max: Orientation.names.length - 1,
                    }),
                    inclination: sensibleFloat,
                    overshading: arbOvershading.map(solarHotWaterOvershadingFactor),
                    Vs: sensibleFloat,
                    combined_cylinder_volume: sensibleFloat,
                }),
                use_SHW: fc.oneof(fc.boolean(), fc.constant(1)),
                LAC_calculation_type: arbLAC_calculation_type(),
                LAC: arbLAC(Object.keys(fuels)),
            }),
        )
        .filter((scenario) => {
            // Custom occupancy invariant:
            if (
                (scenario.use_custom_occupancy === true ||
                    scenario.use_custom_occupancy === 1) &&
                (scenario.custom_occupancy === undefined ||
                    scenario.custom_occupancy === '')
            ) {
                return false; // Throws ModelError in new model
            }

            // Custom water annual energy content invariant
            if (
                scenario.water_heating?.override_annual_energy_content &&
                scenario.water_heating.annual_energy_content === undefined
            ) {
                return false;
            }

            // If no top-level fuels then no LAC fuels
            if (scenario.fuels === undefined) {
                if (
                    scenario.LAC?.fuels_lighting !== undefined ||
                    scenario.LAC?.fuels_appliances !== undefined ||
                    scenario.LAC?.fuels_cooking !== undefined
                ) {
                    return false;
                }
            }

            // If SHW is enabled make sure input is complete
            if (scenario.SHW !== undefined) {
                const inputs = pick(scenario.SHW, ...SHWInputKeys);
                const moduleIsEnabled =
                    scenario.use_SHW || scenario.water_heating?.solar_water_heating;
                const inputIsComplete = SHWInputKeys.reduce(
                    (allInputsWerePresent, key) =>
                        allInputsWerePresent && inputs[key] !== undefined,
                    true,
                );
                if (moduleIsEnabled) {
                    return inputIsComplete;
                }
            }

            return true;
        });

export const SHWInputKeys = [
    'pump',
    'A',
    'n0',
    'a1',
    'a2',
    'orientation',
    'inclination',
    'overshading',
    'Vs',
    'combined_cylinder_volume',
] as const;
