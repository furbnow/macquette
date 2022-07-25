import assert from 'assert';
import fc from 'fast-check';
import { last } from 'lodash';

import {
    exportsForTest,
    TabularFunction,
} from '../../../../src/v2/model/datasets/tabular-function';
import { arbFloat } from '../../../helpers/arbitraries';

const { findClosestLeftIndex, linearInterpolateClamped } = exportsForTest;

describe('tabular function', () => {
    describe('bilinear interpolation', () => {
        const cases = [
            {
                name: 'example from Appendix C, Building Act 1984',
                input: {
                    xValues: [1.5, 2],
                    yValues: [0.5, 0.55],
                    table: [
                        [0.33, 0.28],
                        [0.34, 0.28],
                    ],
                    x: 1.875,
                    y: 0.517,
                },
                expected: 0.29335,
            },
            {
                name: 'example with a function with only one value',
                input: {
                    xValues: [0],
                    yValues: [0],
                    table: [[1]],
                    x: 0,
                    y: 0,
                },
                expected: 1,
            },
            {
                name: 'example with no interpolation needed in x',
                input: {
                    xValues: [0, 3],
                    yValues: [-10, -4],
                    table: [
                        [4, 5],
                        [6, 7],
                    ],
                    x: 3,
                    y: -7,
                },
                expected: 6,
            },
            {
                name: 'example with no interpolation needed in y',
                input: {
                    xValues: [0, 3],
                    yValues: [-10, -4],
                    table: [
                        [4, 5],
                        [6, 7],
                    ],
                    x: 1.5,
                    y: -10,
                },
                expected: 4.5,
            },
            {
                name: 'example with no interpolation needed in any dimension',
                input: {
                    xValues: [0, 3],
                    yValues: [-10, -4],
                    table: [
                        [4, 5],
                        [6, 7],
                    ],
                    x: 3,
                    y: -10,
                },
                expected: 5,
            },
        ];
        test.each(cases)(
            '$name',
            ({ input: { xValues, yValues, table, x, y }, expected }) => {
                const fn = TabularFunction.newChecked(xValues, yValues, table).unwrap();
                const value = fn.interpolateAt(x, y).unwrap();
                expect(value).toBeApproximately(expected);
            },
        );
    });

    describe('findClosestLeftIndex helper', () => {
        const arbRange = fc
            .set(arbFloat({ noDefaultInfinity: true, noNaN: true }), { minLength: 1 })
            .map((s) => [...s].sort(numericCompare));

        test('returns err when given an empty array', () => {
            fc.assert(
                fc.property(arbFloat(), (needle) => {
                    expect(findClosestLeftIndex(needle, []).unwrapErr()).toBe(
                        'empty input',
                    );
                }),
            );
        });
        test('returns a value if the needle was between the first and last elements', () => {
            const arb = arbRange.chain((range) =>
                fc.record({
                    range: fc.constant(range),
                    needle: arbFloat({
                        min: range[0]!,
                        max: last(range)!,
                        noNaN: true,
                    }),
                }),
            );
            fc.assert(
                fc.property(arb, ({ range, needle }) => {
                    expect(findClosestLeftIndex(needle, range).isOk()).toBe(true);
                }),
            );
        });
        test('returns an error if the needle was outside the first or last element', () => {
            const arb = arbRange.chain((range) =>
                fc.record({
                    range: fc.constant(range),
                    needle: fc.oneof(
                        arbFloat({
                            max: range[0]!,
                            noNaN: true,
                        }).filter((v) => v !== range[0]!),
                        arbFloat({
                            min: last(range)!,
                            noNaN: true,
                        }).filter((v) => v !== last(range)!),
                    ),
                }),
            );
            fc.assert(
                fc.property(arb, ({ range, needle }) => {
                    expect(findClosestLeftIndex(needle, range).unwrapErr()).toMatch(
                        /^(needle too low)|(needle too high)$/,
                    );
                }),
            );
        });
        test('needle is in the range given by the returned indexes', () => {
            const arb = arbRange.chain((range) =>
                fc.record({
                    range: fc.constant(range),
                    needle: arbFloat({
                        min: range[0]!,
                        max: last(range)!,
                        noNaN: true,
                    }),
                }),
            );
            fc.assert(
                fc.property(arb, ({ range, needle }) => {
                    const result = findClosestLeftIndex(needle, range);
                    assert(result.isOk());
                    const start = result.coalesce();
                    expect(range[start]!).toBeLessThanOrEqual(needle);
                    if (start < range.length - 1) {
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(range[start + 1]).toBeGreaterThanOrEqual(needle);
                    }
                }),
            );
        });
    });

    describe('simple linear interpolation', () => {
        it('errors if x0 > x1', () => {
            expect(() =>
                linearInterpolateClamped({ x0: 1, y0: NaN, x1: 1, y1: NaN }, NaN),
            ).toThrow();
            expect(() =>
                linearInterpolateClamped({ x0: 2, y0: NaN, x1: 1, y1: NaN }, NaN),
            ).toThrow();
        });

        it('does interpolation', () => {
            expect(linearInterpolateClamped({ x0: 0, y0: 100, x1: 5, y1: -400 }, 1)).toBe(
                0,
            );
            expect(
                linearInterpolateClamped({ x0: -0.5, y0: 20, x1: 0, y1: 40 }, -0.1),
            ).toBe(36);
        });

        it('does edge cases', () => {
            expect(linearInterpolateClamped({ x0: 0, y0: 100, x1: 5, y1: -400 }, 0)).toBe(
                100,
            );
            expect(linearInterpolateClamped({ x0: 0, y0: 100, x1: 5, y1: -400 }, 5)).toBe(
                -400,
            );
        });
    });
});

function numericCompare(a: number, b: number): -1 | 0 | 1 {
    return a < b ? -1 : a === b ? 0 : 1;
}
