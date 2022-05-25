import fc from 'fast-check';

import { isTruthy } from '../../../../src/v2/helpers/is-truthy';
import { Region } from '../../../../src/v2/model/enums/region';
import { fcPartialRecord, merge } from '../../../helpers/arbitraries';
import { arbLAC, arbLAC_calculation_type } from './LAC';
import { arbFabric } from './fabric';
import { arbFuels } from './fuels';
import { shwInputIsComplete, shwInputs } from './solar-hot-water';
import { legacyBoolean, sensibleFloat } from './values';
import { arbVentilation } from './ventilation';
import { heatingSystemInputs, waterHeatingInputs } from './water-heating';

const arbFloors = () =>
    fc.array(
        fc.record({
            area: fc.oneof(sensibleFloat, fc.constant('')),
            height: fc.oneof(sensibleFloat, fc.constant('')),
            name: fc.string(),
        }),
    );

export const arbScenarioInputs = () =>
    arbFuels()
        .chain((fuels) =>
            merge(
                fc.record({
                    fuels: fc.constant(fuels),
                }),
                fcPartialRecord({
                    floors: arbFloors(),
                    use_custom_occupancy: legacyBoolean(),
                    custom_occupancy: fc.oneof(fc.nat(), fc.constant('')),
                    region: fc.integer({ min: 0, max: Region.names.length - 1 }),
                    fabric: arbFabric(),
                    water_heating: waterHeatingInputs,
                    SHW: shwInputs,
                    use_SHW: fc.oneof(fc.boolean(), fc.constant(1)),
                    LAC_calculation_type: arbLAC_calculation_type(),
                    LAC: arbLAC(Object.keys(fuels)),
                    ventilation: arbVentilation(),
                    num_of_floors_override: fc.nat(),
                    heating_systems: heatingSystemInputs(Object.keys(fuels)),
                    space_heating: fc.constant({}),
                }),
            ),
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
