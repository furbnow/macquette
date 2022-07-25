import { constructFloorUValueModel } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator';
import { FloorUValueModelInput } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator/input-types';

describe('suspended floor', () => {
    test('an uninsulated test case', () => {
        const input: FloorUValueModelInput = {
            common: {
                area: 40,
                exposedPerimeter: 25.5,
            },
            perFloorType: {
                floorType: 'suspended',
                ventilationCombinedArea: 0.04,
                underFloorSpacePerimeter: 20,
                insulationLayers: null,
            },
        };
        const { uValue } = constructFloorUValueModel(input);
        const [value, warnings] = uValue.inner();
        expect(value).toBeApproximately(0.7558);
        expect(warnings.size).toBe(0);
    });

    test('an insulated test case', () => {
        const input: FloorUValueModelInput = {
            common: {
                area: 40,
                exposedPerimeter: 25.5,
            },
            perFloorType: {
                floorType: 'suspended',
                ventilationCombinedArea: 0.04,
                underFloorSpacePerimeter: 20,
                insulationLayers: [
                    {
                        thickness: 0.1,
                        mainMaterial: {
                            name: '',
                            tags: [],
                            description: '',
                            tag: '',
                            conductivity: 1,
                        },
                        bridging: null,
                    },
                ],
            },
        };
        const { uValue } = constructFloorUValueModel(input);
        const [value, warnings] = uValue.inner();
        expect(value).toBeApproximately(0.8176);
        expect(warnings.size).toBe(0);
    });
});
