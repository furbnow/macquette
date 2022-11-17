import { constructFloorUValueModel } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator';
import { FloorLayerInput } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator/floor-layer-input';
import { FloorUValueModelInput } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator/input-types';

describe('suspended floor', () => {
    test('an insulated test case', () => {
        const input: FloorUValueModelInput = {
            common: {
                area: 40,
            },
            perFloorType: {
                floorType: 'suspended',
                ventilationCombinedArea: 0.04,
                underFloorSpacePerimeter: 20,
                layers: [
                    FloorLayerInput.validate({
                        thickness: 0.1,
                        mainMaterial: {
                            mechanism: 'conductivity',
                            name: '',
                            tags: [],
                            description: '',
                            tag: '',
                            conductivity: 1,
                        },
                        bridging: { material: null, proportion: null },
                    })
                        .unwrap(() => undefined)
                        .unwrap(),
                ],
            },
        };
        const { uValue } = constructFloorUValueModel(input);
        const [value, warnings] = uValue.inner();
        expect(value).toBeApproximately(0.7219);
        expect(warnings.size).toBe(0);
    });
});
