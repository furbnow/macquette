import fc from 'fast-check';

import {
  Action,
  reducer,
  State,
} from '../../../src/ui/modules/floor-row/u-value-calculator/floor-types/suspended';
import {
  arbFloorLayerSpec,
  arbSuspendedFloorSpec,
} from '../../arbitraries/scenario/floor-u-value-calculator/scenario-spec';
import { fcNonEmptyArray } from '../../helpers/arbitraries';

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
            layers: newLayers,
          },
        };
        const newState = reducer(state, action);
        expect(newState.layers).toEqual(newLayers);
      }),
    );
  });
});
