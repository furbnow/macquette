import fc from 'fast-check';
import { Region } from '../../../../src/v2/model/enums/region';
import { fcPartialRecord } from '../../../helpers/arbitraries';
import { arbFabric } from './fabric';
import { legacyBoolean, sensibleFloat } from './values';

const arbFloors = () =>
    fc.array(
        fc.record({
            area: fc.oneof(sensibleFloat, fc.constant('')),
            height: fc.oneof(sensibleFloat, fc.constant('')),
            name: fc.string(),
        }),
    );

// Only model input values
export const arbScenario = () =>
    fcPartialRecord({
        floors: arbFloors(),
        use_custom_occupancy: legacyBoolean(),
        custom_occupancy: fc.oneof(sensibleFloat, fc.constant('')),
        region: fc.integer({ min: 0, max: Region.names.length - 1 }),
        fabric: arbFabric(),
        water_heating: fcPartialRecord({
            low_water_use_design: fc.oneof(fc.boolean(), fc.constant(1)),
            annual_energy_content: sensibleFloat,
            override_annual_energy_content: fc.oneof(fc.boolean(), fc.constant(1)),
        }),
    }).filter((scenario) => {
        // Custom occupancy invariant:
        if (
            (scenario.use_custom_occupancy === true ||
                scenario.use_custom_occupancy === 1) &&
            (scenario.custom_occupancy === undefined || scenario.custom_occupancy === '')
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

        return true;
    });
