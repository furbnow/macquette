import fc from 'fast-check';

import {
    assertNonEmpty,
    NonEmptyArray,
} from '../../../../src/v2/helpers/non-empty-array';
import { Proportion } from '../../../../src/v2/helpers/proportion';
import { Result } from '../../../../src/v2/helpers/result';
import {
    CombinedMethodInput,
    CombinedMethodModel,
} from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator/combined-method';
import { arbFloat, FcInfer, fcNonEmptyArray } from '../../../helpers/arbitraries';

function arbProportionPartition(options?: {
    maxLength: number;
}): fc.Arbitrary<NonEmptyArray<Proportion>> {
    const out = fc
        .array(
            fc.float({
                min: 0,
                max: 1,
                next: true,
                noNaN: true,
                noDefaultInfinity: true,
            }),
            {
                minLength: 0,
                maxLength: (options?.maxLength ?? 10) - 1,
            },
        )
        .map((boundaries) => {
            const sorted = boundaries.sort((a, b) => a - b);
            let pos = 0;
            const out = [];
            for (const boundary of sorted) {
                out.push(Proportion.fromRatio(boundary - pos).unwrap());
                pos = boundary;
            }
            out.push(Proportion.fromRatio(1 - pos).unwrap());
            return assertNonEmpty(out);
        });
    return out;
}

const arbCombinedMethodInput: fc.Arbitrary<CombinedMethodInput> = fc.record({
    layers: fcNonEmptyArray(
        fc.record({
            elements: arbProportionPartition({ maxLength: 3 }).chain((proportions) =>
                fc
                    .tuple(
                        ...proportions.map((proportion) =>
                            fc.record({
                                name: fc.constant('some element'),
                                proportion: fc.constant(proportion),
                                resistance: arbFloat(),
                            }),
                        ),
                    )
                    .map(assertNonEmpty),
            ),
        }),
        { maxLength: 4 },
    ),
});

describe('combined method', () => {
    it('always returns a finite number or a zero division error', () => {
        const examples: Array<[FcInfer<typeof arbCombinedMethodInput>]> = [];
        fc.assert(
            fc.property(arbCombinedMethodInput, (input) => {
                const combinedMethod = new CombinedMethodModel(input);
                const props = [
                    'lowerBoundResistance',
                    'upperBoundResistance',
                    'resistance',
                    'uValue',
                ] as const;
                for (const prop of props) {
                    const valueR = Result.fromUnion(combinedMethod[prop]);
                    if (!valueR.isOk()) {
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(combinedMethod.uValue).toEqual(
                            Result.err('zero division error'),
                        );
                        return;
                    }
                    const value = valueR.coalesce();
                    try {
                        expect(value).not.toBeNaN();
                        expect(value).not.toBe(Infinity);
                        expect(value).not.toBe(-Infinity);
                    } catch (e) {
                        console.log(prop);
                        throw e;
                    }
                }
            }),
            { numRuns: 500, examples },
        );
    });

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
        expect(model.upperBoundResistance.unwrap()).toBeCloseTo(3.435, 2);
        expect(model.lowerBoundResistance.unwrap()).toBeCloseTo(3.304, 2);
        expect(model.uValue.unwrap()).toBeCloseTo(0.297, 2);
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
        expect(model.upperBoundResistance.unwrap()).toBeCloseTo(3.617, 2);
        expect(model.lowerBoundResistance.unwrap()).toBeCloseTo(3.136, 2);
        expect(model.uValue.unwrap()).toBeCloseTo(0.3, 2);
    });
});

function mm(n: number) {
    return n / 1000;
}
