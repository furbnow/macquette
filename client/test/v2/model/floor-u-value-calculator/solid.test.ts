import { FloorInsulationConductivityMaterial } from '../../../../src/v2/data-schemas/libraries/floor-insulation';
import { constructFloorUValueModel } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator';
import {
    FloorUValueModelInput,
    SolidFloorInput,
} from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator/input-types';

type TestCase<I, O> = { name: string; input: I; expected: O };

describe('solid floor', () => {
    const withoutEdgeInsulationCases: Array<TestCase<FloorUValueModelInput, number>> = [
        {
            name: 'top left corner',
            input: {
                common: {
                    area: 100,
                },
                perFloorType: {
                    floorType: 'solid',
                    exposedPerimeter: 5,
                    allOverInsulation: null,
                    edgeInsulation: { type: 'none' },
                },
            },
            expected: 0.13,
        },
        {
            name: 'top right corner',
            input: {
                common: {
                    area: 100,
                },
                perFloorType: {
                    floorType: 'solid',
                    exposedPerimeter: 5,
                    allOverInsulation: {
                        mechanism: 'conductivity',
                        thickness: 2,
                        material: {
                            mechanism: 'conductivity',
                            name: '',
                            tag: '',
                            description: '',
                            conductivity: 1,
                        },
                    },
                    edgeInsulation: { type: 'none' },
                },
            },
            expected: 0.08,
        },
        {
            name: 'bottom right corner',
            input: {
                common: {
                    area: 100,
                },
                perFloorType: {
                    floorType: 'solid',
                    exposedPerimeter: 100,
                    allOverInsulation: {
                        mechanism: 'conductivity',
                        thickness: 2,
                        material: {
                            mechanism: 'conductivity',
                            name: '',
                            tag: '',
                            description: '',
                            conductivity: 1,
                        },
                    },
                    edgeInsulation: { type: 'none' },
                },
            },
            expected: 0.33,
        },
        {
            name: 'bottom left corner',
            input: {
                common: {
                    area: 100,
                },
                perFloorType: {
                    floorType: 'solid',
                    exposedPerimeter: 100,
                    allOverInsulation: null,
                    edgeInsulation: { type: 'none' },
                },
            },
            expected: 1.05,
        },
    ];
    test.each(withoutEdgeInsulationCases)(
        'without edge insulation: $name',
        ({ input, expected }) => {
            const model = constructFloorUValueModel(input);
            const [out, warnings] = model.uValue.inner();
            expect(out).toBe(expected);
            expect(warnings.size).toBe(0);
        },
    );

    function insulationConductivityMaterial(
        conductivity: number,
    ): FloorInsulationConductivityMaterial {
        return {
            mechanism: 'conductivity',
            name: '',
            description: '',
            tag: '',
            conductivity,
        };
    }
    function basicSolidFloor(
        edgeInsulation: SolidFloorInput['edgeInsulation'],
    ): FloorUValueModelInput {
        return {
            common: {
                area: 200,
            },
            perFloorType: {
                floorType: 'solid',
                exposedPerimeter: 100,
                allOverInsulation: {
                    mechanism: 'conductivity',
                    thickness: 1,
                    material: insulationConductivityMaterial(1),
                },
                edgeInsulation,
            },
        };
    }
    const withEdgeInsulationCases: Array<TestCase<FloorUValueModelInput, number>> = [
        {
            name: 'horizontal top left',
            input: basicSolidFloor({
                type: 'horizontal',
                mechanism: 'conductivity',
                width: 0.5,
                thickness: 0.5,
                material: insulationConductivityMaterial(1),
            }),
            expected: 0.335,
        },
        {
            name: 'horizontal top right',
            input: basicSolidFloor({
                type: 'horizontal',
                mechanism: 'conductivity',
                width: 0.5,
                thickness: 2,
                material: insulationConductivityMaterial(1),
            }),
            expected: 0.29,
        },
        {
            name: 'horizontal bottom right',
            input: basicSolidFloor({
                type: 'horizontal',
                mechanism: 'conductivity',
                width: 1.5,
                thickness: 2,
                material: insulationConductivityMaterial(1),
            }),
            expected: 0.19,
        },
        {
            name: 'horizontal bottom left',
            input: basicSolidFloor({
                type: 'horizontal',
                mechanism: 'conductivity',
                width: 1.5,
                thickness: 0.5,
                material: insulationConductivityMaterial(1),
            }),
            expected: 0.285,
        },
        {
            name: 'vertical top left',
            input: basicSolidFloor({
                type: 'vertical',
                mechanism: 'conductivity',
                depth: 0.25,
                thickness: 0.5,
                material: insulationConductivityMaterial(1),
            }),
            expected: 0.335,
        },
        {
            name: 'vertical top right',
            input: basicSolidFloor({
                type: 'vertical',
                mechanism: 'conductivity',
                depth: 0.25,
                thickness: 2,
                material: insulationConductivityMaterial(1),
            }),
            expected: 0.29,
        },
        {
            name: 'vertical bottom right',
            input: basicSolidFloor({
                type: 'vertical',
                mechanism: 'conductivity',
                depth: 1.0,
                thickness: 2,
                material: insulationConductivityMaterial(1),
            }),
            expected: 0.16,
        },
        {
            name: 'vertical bottom left',
            input: basicSolidFloor({
                type: 'vertical',
                mechanism: 'conductivity',
                depth: 1.0,
                thickness: 0.5,
                material: insulationConductivityMaterial(1),
            }),
            expected: 0.27,
        },
    ];
    test.each(withEdgeInsulationCases)(
        'with edge insulation: $name',
        ({ input, expected }) => {
            const model = constructFloorUValueModel(input);
            const [out, warnings] = model.uValue.inner();
            expect(out).toBeApproximately(expected);
            expect(warnings.size).toBe(0);
        },
    );
});
