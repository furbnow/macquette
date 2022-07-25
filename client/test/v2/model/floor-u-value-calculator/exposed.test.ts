import fc from 'fast-check';
import { isEqual } from 'lodash';

import { Proportion } from '../../../../src/v2/helpers/proportion';
import { constructFloorUValueModel } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator';
import {
    ExposedFloorInput,
    FloorLayerInput,
    FloorUValueModelInput,
} from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator/input-types';
import { fcNonEmptyArray } from '../../../helpers/arbitraries';
import { sensibleFloat } from '../arbitraries/values';

const arbFloorInsulationMaterialItem = sensibleFloat.map((conductivity) => ({
    conductivity,
    tags: undefined,
    tag: 'arb tag',
    name: 'arb name',
    description: 'arb description',
}));

const arbFloorLayerInput: fc.Arbitrary<FloorLayerInput> = fc.record({
    thickness: sensibleFloat,
    mainMaterial: arbFloorInsulationMaterialItem,
    bridging: fc.option(
        fc.record({
            material: arbFloorInsulationMaterialItem,
            proportion: fc
                .float({
                    min: 0,
                    max: 1,
                    noNaN: true,
                    noDefaultInfinity: true,
                    next: true,
                })
                .map((ratio) => Proportion.fromRatio(ratio).unwrap()),
        }),
    ),
});

const arbInput: fc.Arbitrary<ExposedFloorInput> = fc.record({
    floorType: fc.constant('exposed'),
    exposedTo: fc.constantFrom('outside air', 'unheated space'),
    insulationLayers: fc.option(fcNonEmptyArray(arbFloorLayerInput)),
});

type TestCase<I, O> = { name: string; input: I; expected: O };

describe('exposed floor', () => {
    const cases: Array<TestCase<FloorUValueModelInput, number>> = [
        {
            name: 'outside air (no insulation)',
            input: {
                common: {
                    area: 100,
                    exposedPerimeter: 5,
                },
                perFloorType: {
                    floorType: 'exposed',
                    exposedTo: 'outside air',
                    insulationLayers: null,
                },
            },
            expected: 4.762,
        },
        {
            name: 'unheated space (no insulation)',
            input: {
                common: {
                    area: 100,
                    exposedPerimeter: 5,
                },
                perFloorType: {
                    floorType: 'exposed',
                    exposedTo: 'unheated space',
                    insulationLayers: null,
                },
            },
            expected: 2.941,
        },
        {
            name: 'unheated space (single unbridged layer of insulation)',
            input: {
                common: {
                    area: 100,
                    exposedPerimeter: 5,
                },
                perFloorType: {
                    floorType: 'exposed',
                    exposedTo: 'unheated space',
                    insulationLayers: [
                        {
                            thickness: 0.01,
                            mainMaterial: {
                                conductivity: 2,
                                tag: '',
                                description: '',
                                name: '',
                            },
                            bridging: null,
                        },
                    ],
                },
            },
            expected: 2.8986,
        },
        {
            name: 'outside air (multiple layers of insulation including bridging)',
            input: {
                common: {
                    area: 100,
                    exposedPerimeter: 5,
                },
                perFloorType: {
                    floorType: 'exposed',
                    exposedTo: 'outside air',
                    insulationLayers: [
                        {
                            thickness: 0.01,
                            mainMaterial: {
                                conductivity: 2,
                                tag: '',
                                description: '',
                                name: '',
                            },
                            bridging: null,
                        },
                        {
                            thickness: 0.02,
                            mainMaterial: {
                                conductivity: 2,
                                tag: '',
                                description: '',
                                name: '',
                            },
                            bridging: {
                                material: {
                                    conductivity: 3,
                                    tag: '',
                                    description: '',
                                    name: '',
                                },
                                proportion: Proportion.fromRatio(0.15).unwrap(),
                            },
                        },
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
