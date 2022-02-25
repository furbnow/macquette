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

export const arbScenario = () =>
    fcPartialRecord({
        floors: arbFloors(),
        use_custom_occupancy: legacyBoolean(),
        custom_occupancy: fc.oneof(sensibleFloat, fc.constant('')),
        region: fc.integer({ min: 0, max: Region.names.length - 1 }),
        fabric: arbFabric(),
    }).filter((scenario) => {
        // Custom occupancy invariant:
        if (
            (scenario.use_custom_occupancy === true ||
                scenario.use_custom_occupancy === 1) &&
            (scenario.custom_occupancy === undefined || scenario.custom_occupancy === '')
        ) {
            return false; // Throws ModelError in new model
        }

        return true;
    });
