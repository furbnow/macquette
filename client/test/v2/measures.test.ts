import fc from 'fast-check';

import { calcMeasureQtyAndCost, reverseCalcQuantity } from '../../src/v2/measures';

describe('reverseCalcQuantity', () => {
    it('correctly calculates the quantity that calcMeasureQtyAndCost produces', () => {
        fc.assert(
            fc.property(
                fc.tuple(fc.nat(), fc.nat(), fc.nat(), fc.boolean()),
                ([baseCost, costPerUnit, area, isExternalWallInsulation]) => {
                    // This case never happens IRL
                    fc.pre(costPerUnit !== 0);

                    const [qty, totalCost] = calcMeasureQtyAndCost({
                        costUnits: 'sqm',
                        area,
                        costPerUnit,
                        baseCost,
                        isExternalWallInsulation,
                    });
                    const reversedQty = reverseCalcQuantity(
                        baseCost,
                        costPerUnit,
                        totalCost,
                    );

                    expect(reversedQty.toFixed(2)).toEqual(qty.toFixed(2));
                },
            ),
        );
    });
});
