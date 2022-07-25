import { constructFloorUValueModel } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator';
import { FloorUValueModelInput } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator/input-types';

type TestCase<I, O> = { name: string; input: I; expected: O };

describe('unheated basement', () => {
    const testCases: Array<TestCase<FloorUValueModelInput, number>> = [
        {
            name: 'without insulation - top left corner',
            input: {
                common: {
                    area: 100,
                    exposedPerimeter: 10,
                },
                perFloorType: {
                    floorType: 'heated basement',
                    basementDepth: 0.5,
                    insulation: null,
                },
            },
            expected: 0.2,
        },
        {
            name: 'without insulation - top right corner',
            input: {
                common: {
                    area: 100,
                    exposedPerimeter: 10,
                },
                perFloorType: {
                    floorType: 'heated basement',
                    basementDepth: 2.5,
                    insulation: null,
                },
            },
            expected: 0.16,
        },
        {
            name: 'without insulation - bottom right corner',
            input: {
                common: {
                    area: 100,
                    exposedPerimeter: 100,
                },
                perFloorType: {
                    floorType: 'heated basement',
                    basementDepth: 2.5,
                    insulation: null,
                },
            },
            expected: 0.54,
        },
        {
            name: 'without insulation - bottom left corner',
            input: {
                common: {
                    area: 100,
                    exposedPerimeter: 100,
                },
                perFloorType: {
                    floorType: 'heated basement',
                    basementDepth: 0.5,
                    insulation: null,
                },
            },
            expected: 0.89,
        },
        {
            name: 'with insulation - middle',
            input: {
                common: {
                    area: 100,
                    exposedPerimeter: 50,
                },
                perFloorType: {
                    floorType: 'heated basement',
                    basementDepth: 1.5,
                    insulation: {
                        thickness: 0.01,
                        material: {
                            name: '',
                            tag: '',
                            description: '',
                            conductivity: 3,
                        },
                    },
                },
            },
            expected: 0.4992,
        },
    ];
    test.each(testCases)('without insulation: $name', ({ input, expected }) => {
        const model = constructFloorUValueModel(input);
        const [out, warnings] = model.uValue.inner();
        expect(out).toBeApproximately(expected);
        expect(warnings.size).toBe(0);
    });
});
