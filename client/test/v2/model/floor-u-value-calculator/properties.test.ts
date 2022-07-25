import fc from 'fast-check';

import { constructFloorUValueModel } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator';
import { FloorUValueModelInput } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator/input-types';
import { arbFloorUValueModelInput } from '../arbitraries/floor-u-value-calculator/model-input';

describe('floor u-value model property tests', () => {
    it('does not throw any errors', () => {
        const examples: Array<[FloorUValueModelInput]> = [
            [
                {
                    common: { area: 0.0078125, exposedPerimeter: 0.0078125 },
                    perFloorType: {
                        floorType: 'suspended',
                        ventilationCombinedArea: 0.0078125,
                        underFloorSpacePerimeter: -0.0078125,
                        insulationLayers: null,
                    },
                },
            ],
        ];
        fc.assert(
            fc.property(arbFloorUValueModelInput(), (input) => {
                const model = constructFloorUValueModel(input);
                expect(() => model.uValue).not.toThrow();
            }),
            { examples },
        );
    });
});
