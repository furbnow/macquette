import fc from 'fast-check';
import { Region } from '../../../../src/v2/model/enums/region';
import { fcPartialRecord } from '../../../helpers/arbitraries';
import {
    legacyBoolean,
    sensibleFloat,
    stringySensibleInteger,
    stringySensibleFloat,
} from './values';
import { arbFabric } from './fabric';
import { shwInputIsComplete, shwInputs } from './solar-hot-water';
import { isTruthy } from '../../../../src/v2/helpers/is-truthy';

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
        { maxKeys: 5 },
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
        L: stringySensibleInteger(),
        LLE: stringySensibleInteger(),
        reduced_heat_gains_lighting: legacyBoolean(),
        energy_efficient_appliances: legacyBoolean(),
        energy_efficient_cooking: legacyBoolean(),
        fuels_lighting: arbLACFuels(fuelNames),
        fuels_appliances: arbLACFuels(fuelNames),
        fuels_cooking: arbLACFuels(fuelNames),
    });

const arbVentilation = () =>
    fcPartialRecord({
        IVF: fc.array(fc.record({ ventilation_rate: stringySensibleFloat() })),
        air_permeability_test: legacyBoolean(),
        air_permeability_value: stringySensibleFloat(),
        dwelling_construction: fc.oneof(
            ...(['timberframe', 'masonry'] as const).map(fc.constant),
        ),
        suspended_wooden_floor: fc.oneof(
            ...([0, 'sealed', 'unsealed'] as const).map(fc.constant),
        ),
        percentage_draught_proofed: sensibleFloat,
        draught_lobby: legacyBoolean(),
        number_of_sides_sheltered: fc.nat(),
        ventilation_type: fc.oneof(
            ...(['NV', 'IE', 'MEV', 'PS', 'MVHR', 'MV', 'DEV'] as const).map(fc.constant),
        ),
        EVP: fc.array(fc.record({ ventilation_rate: stringySensibleFloat() })),
        system_air_change_rate: fc.oneof(
            fc.constant('na'),
            fc.constant('n/a'),
            stringySensibleFloat(),
        ),
        balanced_heat_recovery_efficiency: fc.oneof(
            fc.constant('na'),
            fc.constant('n/a'),
            stringySensibleFloat(),
        ),
    });

export const arbScenarioInputs = () =>
    arbFuels()
        .chain((fuels) =>
            fcPartialRecord({
                fuels: fc.constant(fuels),
                floors: arbFloors(),
                use_custom_occupancy: legacyBoolean(),
                custom_occupancy: fc.oneof(fc.nat(), fc.constant('')),
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
                SHW: shwInputs,
                use_SHW: fc.oneof(fc.boolean(), fc.constant(1)),
                LAC_calculation_type: arbLAC_calculation_type(),
                LAC: arbLAC(Object.keys(fuels)),
                ventilation: arbVentilation(),
                num_of_floors_override: fc.nat(),
            }),
        )
        .filter((scenario) => {
            // If a custom occupancy is configured, make sure a value is given
            if (
                (scenario.use_custom_occupancy === true ||
                    scenario.use_custom_occupancy === 1) &&
                (scenario.custom_occupancy === undefined ||
                    scenario.custom_occupancy === '')
            ) {
                return false; // Throws ModelError in new model
            }

            // If a water heating override is configured, make sure a value is
            // given
            if (
                isTruthy(scenario.water_heating?.override_annual_energy_content) &&
                scenario.water_heating?.annual_energy_content === undefined
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
                const moduleIsEnabled =
                    isTruthy(scenario.use_SHW) ||
                    isTruthy(scenario.water_heating?.solar_water_heating);
                if (moduleIsEnabled) {
                    return shwInputIsComplete(scenario.SHW);
                }
            }

            return true;
        });
