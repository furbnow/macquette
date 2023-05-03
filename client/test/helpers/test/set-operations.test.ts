import * as fc from 'fast-check';

import { compareSets } from '../set-operations';

describe('set operations', () => {
    describe('compare sets', () => {
        test('empty sets', () => {
            expect(compareSets(new Set(), new Set())).toEqual({
                onlyLHS: new Set(),
                intersection: new Set(),
                onlyRHS: new Set(),
            });
        });

        test('empty lhs', () => {
            expect(compareSets(new Set(), new Set([1, 2, 3]))).toEqual({
                onlyLHS: new Set(),
                intersection: new Set(),
                onlyRHS: new Set([1, 2, 3]),
            });
        });

        test('disjoint', () => {
            expect(compareSets(new Set([1, 2]), new Set([3, 4]))).toEqual({
                onlyLHS: new Set([1, 2]),
                intersection: new Set(),
                onlyRHS: new Set([3, 4]),
            });
        });

        test('not-disjoint', () => {
            expect(compareSets(new Set([1, 2, 3]), new Set([3, 4, 5]))).toEqual({
                onlyLHS: new Set([1, 2]),
                intersection: new Set([3]),
                onlyRHS: new Set([4, 5]),
            });
        });

        test('symmetry', () => {
            const arb = fc.record({
                lhs: fc.uniqueArray(fc.anything()),
                rhs: fc.uniqueArray(fc.anything()),
            });
            fc.assert(
                fc.property(arb, ({ lhs, rhs }) => {
                    const cis = compareSets(new Set(lhs), new Set(rhs));
                    const trans = compareSets(new Set(rhs), new Set(lhs));

                    expect(cis).toEqual({
                        onlyLHS: trans.onlyRHS,
                        intersection: trans.intersection,
                        onlyRHS: trans.onlyLHS,
                    });
                }),
            );
        });

        test('onlyLHS, intersection and onlyRHS are all disjoint', () => {
            const arb = fc.record({
                lhs: fc.uniqueArray(fc.anything()),
                rhs: fc.uniqueArray(fc.anything()),
            });
            fc.assert(
                fc.property(arb, ({ lhs, rhs }) => {
                    const result = compareSets(new Set(lhs), new Set(rhs));
                    expect(
                        compareSets(result.onlyLHS, result.intersection).intersection,
                    ).toEqual(new Set());
                    expect(
                        compareSets(result.onlyLHS, result.onlyRHS).intersection,
                    ).toEqual(new Set());
                    expect(
                        compareSets(result.intersection, result.onlyRHS).intersection,
                    ).toEqual(new Set());
                }),
            );
        });
    });
});
