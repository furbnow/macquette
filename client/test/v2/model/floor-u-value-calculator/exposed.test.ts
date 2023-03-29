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
import { sensibleFloat } from '../../arbitraries/legacy-values';
import { arbFloorLayerInput } from '../../arbitraries/scenario/floor-u-value-calculator/model-input';

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
        expect(model.uValue).toBeApproximately(expected);
        expect(model.warnings).toHaveLength(0);
    });

    test('area does not affect u-value', () => {
        const common = fc.record({
            area: sensibleFloat,
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
                expect(modelDifferingArea.uValue).toBe(modelBaseline.uValue);
            }),
        );
    });
});
