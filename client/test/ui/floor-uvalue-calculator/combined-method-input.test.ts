import fc from 'fast-check';

import {
  ExportsForTest,
  exportsForTest,
} from '../../../src/ui/modules/floor-row/u-value-calculator/shared-components/combined-method';
import { arbFloorLayerSpec } from '../../arbitraries/scenario/floor-u-value-calculator/scenario-spec';
import { fcNonEmptyArray } from '../../helpers/arbitraries';

type Layers = ExportsForTest['layers'];
const { reducer } = exportsForTest;

const arbLayers: fc.Arbitrary<Layers> = fcNonEmptyArray(arbFloorLayerSpec);

describe('combined method reducer', () => {
  test('delete layer results in Math.max(n-1, 1) layers when layer index < n', () => {
    const arb = arbLayers.chain((layers) =>
      fc.record({
        layers: fc.constant(layers),
        action: fc.record({
          type: fc.constant('delete layer' as const),
          layerIndex: fc.integer({ min: 0, max: layers.length - 1 }),
        }),
      }),
    );
    fc.assert(
      fc.property(arb, ({ layers, action }) => {
        const newLayers = reducer(layers, action);
        const expectedNewLength = Math.max(layers.length - 1, 1);
        expect(newLayers).toHaveLength(expectedNewLength);
      }),
    );
  });
});
