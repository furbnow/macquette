import { Proportion } from '../../../../src/v2/helpers/proportion';
import {
    CombinedMethodInput,
    CombinedMethodModel,
} from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator/combined-method';

describe('floor u-value calculator combined method', () => {
    /* Tests taken from https://www.gov.scot/binaries/content/documents/govscot/publications/advice-and-guidance/2020/02/tables-of-u-values-and-thermal-conductivity/documents/6-b---worked-examples-of-u-value-calculations-using-the-combined-method/6-b---worked-examples-of-u-value-calculations-using-the-combined-method/govscot%3Adocument/6.B%2B-%2BWorked%2Bexamples%2Bof%2BU-value%2Bcalculations%2Busing%2Bthe%2Bcombined%2Bmethod%2B%2B.pdf
     *
     * The examples in that document relate to walls, but the calculation is
     * the same.
     */

    const whole = Proportion.fromRatio(1).unwrap();
    const externalSurfaceResistance: CombinedMethodInput[0] = {
        calculationType: 'resistance',
        elements: [
            { name: 'external surface resistance', proportion: whole, resistance: 0.04 },
        ],
    };
    const internalSurfaceResistance: CombinedMethodInput[0] = {
        calculationType: 'resistance',
        elements: [
            { name: 'internal surface resistance', proportion: whole, resistance: 0.13 },
        ],
    };

    test('6.B.2 Timber framed wall example', () => {
        const input: CombinedMethodInput = [
            externalSurfaceResistance,
            {
                calculationType: 'conductivity',
                thickness: mm(102),
                elements: [
                    { name: 'brick outer leaf', proportion: whole, conductivity: 0.77 },
                ],
            },
            {
                calculationType: 'resistance',
                elements: [{ name: 'air cavity', proportion: whole, resistance: 0.18 }],
            },
            {
                calculationType: 'conductivity',
                thickness: mm(9),
                elements: [
                    {
                        name: 'timber-based sheathing',
                        proportion: whole,
                        conductivity: 0.13,
                    },
                ],
            },
            {
                calculationType: 'conductivity',
                thickness: mm(140),
                elements: [
                    {
                        name: 'mineral wool quilt',
                        proportion: Proportion.fromPercent(85).unwrap(),
                        conductivity: 0.04,
                    },
                    {
                        name: 'studs',
                        proportion: Proportion.fromPercent(15).unwrap(),
                        conductivity: 0.12,
                    },
                ],
            },
            {
                calculationType: 'conductivity',
                thickness: mm(12.5),
                elements: [
                    { name: 'plasterboard', proportion: whole, conductivity: 0.21 },
                ],
            },
            internalSurfaceResistance,
        ];
        const model = new CombinedMethodModel(input);
        expect(model.upperBoundResistance).toBeCloseTo(3.435, 2);
        expect(model.lowerBoundResistance).toBeCloseTo(3.304, 2);
        expect(model.uValue).toBeCloseTo(0.297, 2);
    });

    test('6.B.3 Cavity wall with lightwieght masonry leaf and insulated dry-lining example', () => {
        const input: CombinedMethodInput = [
            externalSurfaceResistance,
            {
                calculationType: 'conductivity',
                thickness: mm(102),
                elements: [
                    { name: 'brick outer leaf', proportion: whole, conductivity: 0.77 },
                ],
            },
            {
                calculationType: 'resistance',
                elements: [{ name: 'air cavity', proportion: whole, resistance: 0.18 }],
            },
            {
                calculationType: 'conductivity',
                thickness: mm(125),
                elements: [
                    {
                        name: 'AAC blocks',
                        proportion: Proportion.fromPercent(93.3).unwrap(),
                        conductivity: 0.11,
                    },
                    {
                        name: 'mortar',
                        proportion: Proportion.fromPercent(6.7).unwrap(),
                        conductivity: 0.88,
                    },
                ],
            },
            {
                calculationType: 'conductivity',
                thickness: mm(89),
                elements: [
                    {
                        name: 'mineral wool quilt',
                        proportion: Proportion.fromPercent(88.2).unwrap(),
                        conductivity: 0.038,
                    },
                    {
                        name: 'timber studs',
                        proportion: Proportion.fromPercent(11.8).unwrap(),
                        conductivity: 0.13,
                    },
                ],
            },
            {
                calculationType: 'conductivity',
                thickness: mm(12.5),
                elements: [
                    { name: 'plasterboard', proportion: whole, conductivity: 0.21 },
                ],
            },
            internalSurfaceResistance,
        ];
        const model = new CombinedMethodModel(input);
        expect(model.upperBoundResistance).toBeCloseTo(3.617, 2);
        expect(model.lowerBoundResistance).toBeCloseTo(3.136, 2);
        expect(model.uValue).toBeCloseTo(0.3, 2);
    });
});

function mm(n: number) {
    return n / 1000;
}
