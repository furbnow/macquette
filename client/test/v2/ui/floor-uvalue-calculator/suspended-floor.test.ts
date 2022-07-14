import fc from 'fast-check';

import {
    Action,
    reducer,
    State,
} from '../../../../src/v2/ui/modules/floor-row/u-value-calculator/floor-types/suspended';
import { fcNonEmptyArray } from '../../../helpers/arbitraries';
import {
    arbFloorLayerSpec,
    arbSuspendedFloorSpec,
} from '../../model/arbitraries/floor-u-value-calculator/scenario-spec';

const arbState: fc.Arbitrary<State> = arbSuspendedFloorSpec;

describe('suspended floor reducer', () => {
    test('merge state with layers results in replacement of layer array', () => {
        const arb = fc.record({
            state: arbState,
            newLayers: fcNonEmptyArray(arbFloorLayerSpec),
        });
        fc.assert(
            fc.property(arb, ({ state, newLayers }) => {
                const action: Action = {
                    type: 'suspended floor/merge state',
                    payload: {
                        insulation: {
                            layers: newLayers,
                        },
                    },
                };
                const newState = reducer(state, action);
                expect(newState.insulation.layers).toEqual(newLayers);
            }),
        );
    });
});
