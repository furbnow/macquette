import fc from 'fast-check';
import { Region } from '../../../../src/v2/model/enums/region';
import { fcOptional } from '../../../helpers/arbitraries';
import { arbFabric } from './fabric';
import { sensibleFloat } from './numeric-values';

const arbFloors = () =>
    fc.array(
        fc.record({
            area: fc.oneof(sensibleFloat, fc.constant('')),
            height: fc.oneof(sensibleFloat, fc.constant('')),
            name: fc.string(),
        }),
    );

export const arbScenario = () =>
    fc
        .record({
            floors: fcOptional(arbFloors()),
            use_custom_occupancy: fcOptional(
                fc.oneof(fc.integer({ min: 0, max: 1 }), fc.boolean()),
            ),
            custom_occupancy: fcOptional(fc.oneof(sensibleFloat, fc.constant(''))),
            region: fcOptional(fc.integer({ min: 0, max: Region.names.length - 1 })),
            fabric: fcOptional(arbFabric()),
        })
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

            return true;
        });
