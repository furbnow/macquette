import fc from 'fast-check';
import { z } from 'zod';
import { scenarioSchema } from '../../../src/v2/data-schemas/scenario';
import { isTruthy } from '../../../src/v2/helpers/is-truthy';
import { Orientation } from '../../../src/v2/model/enums/orientation';
import { Region } from '../../../src/v2/model/enums/region';
import { fcPartialRecord, merge } from '../../helpers/arbitraries';
import {
    legacyBoolean,
    sensibleFloat,
    stringyNumber,
    stringySensibleFloat,
} from './legacy-values';
import { arbLAC, arbLAC_calculation_type } from './scenario/LAC';
import { arbFabric } from './scenario/fabric';
import { arbFuels } from './scenario/fuels';
import { heatingSystemInputs } from './scenario/heating-systems';
import { shwInputIsComplete, shwInputs } from './scenario/solar-hot-water';
import { arbVentilation } from './scenario/ventilation';
import { waterHeatingInputs } from './scenario/water-heating';

function arbFloors() {
    return fc.array(
        fc.record({
            area: fc.oneof(sensibleFloat, fc.constant('' as const)),
            height: fc.oneof(sensibleFloat, fc.constant('' as const)),
            name: fc.string(),
        }),
    );
}

export type ScenarioInput = z.input<typeof scenarioSchema>;
export function arbScenarioInputs(): fc.Arbitrary<ScenarioInput> {
    return arbFuels().chain((fuels) =>
        merge(
            fc.record({ fuels: fc.constant(fuels) }),
            fcPartialRecord({
                use_custom_occupancy: legacyBoolean(),
                custom_occupancy: fc.oneof(fc.nat(), fc.constant('' as const)),
            }).filter((occupancyFields) => {
                // If a custom occupancy is configured, make sure a value is given
                if (
                    (occupancyFields.use_custom_occupancy === true ||
                        occupancyFields.use_custom_occupancy === 1) &&
                    (occupancyFields.custom_occupancy === undefined ||
                        occupancyFields.custom_occupancy === '')
                ) {
                    return false; // Throws ModelError in new model
                } else return true;
            }),
            fcPartialRecord({
                use_SHW: fc.oneof(fc.boolean(), fc.constant(1 as const)),
                water_heating: waterHeatingInputs,
                SHW: shwInputs,
            }).filter((waterFields) => {
                // If SHW is enabled make sure input is complete
                if (waterFields.SHW !== undefined) {
                    const moduleIsEnabled =
                        isTruthy(waterFields.use_SHW) ||
                        isTruthy(waterFields.water_heating?.solar_water_heating);
                    if (moduleIsEnabled) {
                        return shwInputIsComplete(waterFields.SHW);
                    }
                }

                return true;
            }),
            fcPartialRecord({
                floors: arbFloors(),
                region: fc.integer({ min: 0, max: Region.names.length - 1 }),
                fabric: arbFabric(),
                LAC_calculation_type: arbLAC_calculation_type(),
                LAC: arbLAC(Object.keys(fuels)),
                ventilation: arbVentilation(),
                num_of_floors_override: fc.nat(),
                heating_systems: heatingSystemInputs(Object.keys(fuels)),
                space_heating: fc.constant({}),
                generation: merge(
                    fc.record({
                        use_PV_calculator: legacyBoolean(),
                        solarpv_kwp_installed: sensibleFloat,
                        solarpv_overshading: fc
                            .tuple(fc.boolean(), fc.constantFrom(0.5, 0.65, 0.8, 1))
                            .map(([stringy, number]) =>
                                stringy ? number.toString(10) : number,
                            ),
                        solarpv_inclination: stringySensibleFloat(),
                        solarpv_orientation: stringyNumber(
                            fc.integer({
                                min: 0,
                                max: Orientation.names.length - 1,
                            }),
                        ),
                    }),
                    fcPartialRecord({
                        solar_annual_kwh: sensibleFloat,
                        solar_fraction_used_onsite: stringySensibleFloat(),
                        solar_FIT: stringySensibleFloat(),
                        solar_export_FIT: stringySensibleFloat(),
                        wind_annual_kwh: sensibleFloat,
                        wind_fraction_used_onsite: stringySensibleFloat(),
                        wind_FIT: stringySensibleFloat(),
                        wind_export_FIT: stringySensibleFloat(),
                        hydro_annual_kwh: sensibleFloat,
                        hydro_fraction_used_onsite: stringySensibleFloat(),
                        hydro_FIT: stringySensibleFloat(),
                        hydro_export_FIT: stringySensibleFloat(),
                    }),
                ),
                currentenergy: fcPartialRecord({
                    use_by_fuel: fc.dictionary(
                        fc.constantFrom(...Object.keys(fuels)),
                        fc.record({
                            annual_use: fc.oneof(fc.constant('' as const), sensibleFloat),
                        }),
                    ),
                    onsite_generation: fc.constantFrom(1 as const, false as const),
                    generation: fc.option(
                        fc.record({
                            annual_generation: stringySensibleFloat(),
                            fraction_used_onsite: stringySensibleFloat(),
                            annual_FIT_income: stringySensibleFloat(),
                        }),
                        { nil: undefined },
                    ),
                }),
            }),
        ),
    );
}
