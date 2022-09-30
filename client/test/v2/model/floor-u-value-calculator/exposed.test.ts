import fc from 'fast-check';
import { isEqual } from 'lodash';

import { Proportion } from '../../../../src/v2/helpers/proportion';
import { constructFloorUValueModel } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator';
import { FloorLayerInput } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator/floor-layer-input';
import {
    ExposedFloorInput,
    FloorUValueModelInput,
} from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator/input-types';
import { fcNonEmptyArray } from '../../../helpers/arbitraries';
import { arbFloorLayerInput } from '../../model/arbitraries/floor-u-value-calculator/model-input';
import { sensibleFloat } from '../arbitraries/values';

const arbInput: fc.Arbitrary<ExposedFloorInput> = fc.record({
    floorType: fc.constant('exposed'),
    exposedTo: fc.constantFrom('outside air', 'unheated space'),
    layers: fcNonEmptyArray(arbFloorLayerInput()),
});

type TestCase<I, O> = { name: string; input: I; expected: O };

describe('exposed floor', () => {
    const cases: Array<TestCase<FloorUValueModelInput, number>> = [
        {
            name: 'unheated space (single unbridged layer)',
            input: {
                common: {
                    area: 100,
                    exposedPerimeter: 5,
                },
                perFloorType: {
                    floorType: 'exposed',
                    exposedTo: 'unheated space',
                    layers: [
                        FloorLayerInput.validate({
                            thickness: 0.01,
                            mainMaterial: {
                                mechanism: 'conductivity',
                                conductivity: 2,
                                tag: '',
                                description: '',
                                name: '',
                            },
                            bridging: { material: null, proportion: null },
                        })
                            .unwrap(() => undefined)
                            .unwrap(),
                    ],
                },
            },
            expected: 2.8986,
        },
        {
            name: 'outside air (multiple layers including bridging)',
            input: {
                common: {
                    area: 100,
                    exposedPerimeter: 5,
                },
                perFloorType: {
                    floorType: 'exposed',
                    exposedTo: 'outside air',
                    layers: [
                        FloorLayerInput.validate({
                            thickness: 0.01,
                            mainMaterial: {
                                mechanism: 'conductivity',
                                conductivity: 2,
                                tag: '',
                                description: '',
                                name: '',
                            },
                            bridging: { material: null, proportion: null },
                        })
                            .unwrap(() => undefined)
                            .unwrap(),
                        FloorLayerInput.validate({
                            thickness: 0.02,
                            mainMaterial: {
                                mechanism: 'conductivity',
                                conductivity: 2,
                                tag: '',
                                description: '',
                                name: '',
                            },
                            bridging: {
                                material: {
                                    mechanism: 'conductivity',
                                    conductivity: 3,
                                    tag: '',
                                    description: '',
                                    name: '',
                                },
                                proportion: Proportion.fromRatio(0.15).unwrap(),
                            },
                        })
                            .unwrap(() => undefined)
                            .unwrap(),
                    ],
                },
            },
            expected: 4.4564,
        },
    ];
    test.each(cases)('$name', ({ input, expected }) => {
        const model = constructFloorUValueModel(input);
        const [out, warnings] = model.uValue.inner();
        expect(out).toBeApproximately(expected);
        expect(warnings.size).toBe(0);
    });

    test('area and exposed perimeter does not affect u-value', () => {
        const common = fc.record({
            area: sensibleFloat,
            exposedPerimeter: sensibleFloat,
        });
        const commonInputs = fc
            .tuple(common, common)
            .filter(([common1, common2]) => !isEqual(common1, common2));
        fc.assert(
            fc.property(commonInputs, arbInput, ([common1, common2], perFloorType) => {
                const baseline: FloorUValueModelInput = {
                    common: common1,
                    perFloorType,
                };
                const modelBaseline = constructFloorUValueModel(baseline);
                const differingArea: FloorUValueModelInput = {
                    common: { ...common1, area: common2.area },
                    perFloorType,
                };
                const modelDifferingArea = constructFloorUValueModel(differingArea);
                expect(modelDifferingArea.uValue.inner()[0]).toBe(
                    modelBaseline.uValue.inner()[0],
                );
                const differingPerimeter: FloorUValueModelInput = {
                    common: {
                        ...common1,
                        exposedPerimeter: common2.exposedPerimeter,
                    },
                    perFloorType,
                };
                const modelDifferingPerimeter =
                    constructFloorUValueModel(differingPerimeter);
                expect(modelDifferingPerimeter.uValue.inner()[0]).toBe(
                    modelBaseline.uValue.inner()[0],
                );
                const differingBoth: FloorUValueModelInput = {
                    common: common2,
                    perFloorType,
                };
                const modelDifferingBoth = constructFloorUValueModel(differingBoth);
                expect(modelDifferingBoth.uValue.inner()[0]).toBe(
                    modelBaseline.uValue.inner()[0],
                );
            }),
        );
    });
});
