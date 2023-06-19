import { Proportion } from '../../../src/helpers/proportion';
import {
    CombinedMethodInput,
    CombinedMethodModel,
} from '../../../src/model/modules/fabric/floor-u-value-calculator/combined-method';

describe('combined method', () => {
    /* Example tests taken from https://www.gov.scot/binaries/content/documents/govscot/publications/advice-and-guidance/2020/02/tables-of-u-values-and-thermal-conductivity/documents/6-b---worked-examples-of-u-value-calculations-using-the-combined-method/6-b---worked-examples-of-u-value-calculations-using-the-combined-method/govscot%3Adocument/6.B%2B-%2BWorked%2Bexamples%2Bof%2BU-value%2Bcalculations%2Busing%2Bthe%2Bcombined%2Bmethod%2B%2B.pdf
     */

    const whole = Proportion.fromRatio(1).unwrap();
    const externalSurfaceResistance: CombinedMethodInput['layers'][number] = {
        elements: [
            { name: 'external surface resistance', proportion: whole, resistance: 0.04 },
        ],
    };
    const internalSurfaceResistance: CombinedMethodInput['layers'][number] = {
        elements: [
            { name: 'internal surface resistance', proportion: whole, resistance: 0.13 },
        ],
    };

    test('6.B.2 Timber framed wall example', () => {
        const input: CombinedMethodInput = {
            layers: [
                externalSurfaceResistance,
                {
                    elements: [
                        {
                            name: 'brick outer leaf',
                            proportion: whole,
                            resistance: mm(102) / 0.77,
                        },
                    ],
                },
                {
                    elements: [
                        { name: 'air cavity', proportion: whole, resistance: 0.18 },
                    ],
                },
                {
                    elements: [
                        {
                            name: 'timber-based sheathing',
                            proportion: whole,
                            resistance: mm(9) / 0.13,
                        },
                    ],
                },
                {
                    elements: [
                        {
                            name: 'mineral wool quilt',
                            proportion: Proportion.fromPercent(85).unwrap(),
                            resistance: mm(140) / 0.04,
                        },
                        {
                            name: 'studs',
                            proportion: Proportion.fromPercent(15).unwrap(),
                            resistance: mm(140) / 0.12,
                        },
                    ],
                },
                {
                    elements: [
                        {
                            name: 'plasterboard',
                            proportion: whole,
                            resistance: mm(12.5) / 0.21,
                        },
                    ],
                },
                internalSurfaceResistance,
            ],
        };
        const model = new CombinedMethodModel(input);
        expect(model.upperBoundResistance).toBeCloseTo(3.435, 2);
        expect(model.lowerBoundResistance).toBeCloseTo(3.304, 2);
        expect(model.uValue).toBeCloseTo(0.297, 2);
    });

    test('6.B.3 Cavity wall with lightweight masonry leaf and insulated dry-lining example', () => {
        const input: CombinedMethodInput = {
            layers: [
                externalSurfaceResistance,
                {
                    elements: [
                        {
                            name: 'brick outer leaf',
                            proportion: whole,
                            resistance: mm(102) / 0.77,
                        },
                    ],
                },
                {
                    elements: [
                        { name: 'air cavity', proportion: whole, resistance: 0.18 },
                    ],
                },
                {
                    elements: [
                        {
                            name: 'AAC blocks',
                            proportion: Proportion.fromPercent(93.3).unwrap(),
                            resistance: mm(125) / 0.11,
                        },
                        {
                            name: 'mortar',
                            proportion: Proportion.fromPercent(6.7).unwrap(),
                            resistance: mm(125) / 0.88,
                        },
                    ],
                },
                {
                    elements: [
                        {
                            name: 'mineral wool quilt',
                            proportion: Proportion.fromPercent(88.2).unwrap(),
                            resistance: mm(89) / 0.038,
                        },
                        {
                            name: 'timber studs',
                            proportion: Proportion.fromPercent(11.8).unwrap(),
                            resistance: mm(89) / 0.13,
                        },
                    ],
                },
                {
                    elements: [
                        {
                            name: 'plasterboard',
                            proportion: whole,
                            resistance: mm(12.5) / 0.21,
                        },
                    ],
                },
                internalSurfaceResistance,
            ],
        };
        const model = new CombinedMethodModel(input);
        expect(model.upperBoundResistance).toBeCloseTo(3.617, 2);
        expect(model.lowerBoundResistance).toBeCloseTo(3.136, 2);
        expect(model.uValue).toBeCloseTo(0.3, 2);
    });
});

function mm(n: number) {
    return n / 1000;
}
