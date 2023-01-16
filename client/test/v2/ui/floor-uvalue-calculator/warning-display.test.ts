import fc from 'fast-check';

import { Floor } from '../../../../src/v2/model/modules/fabric/element-types';
import { constructFloorUValueModel } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator';
import { warningDisplay } from '../../../../src/v2/ui/modules/floor-row/u-value-calculator/warnings';
import { arbFloorUValueModelInput } from '../../model/arbitraries/floor-u-value-calculator/model-input';
import { arbFloorSpec } from '../../model/arbitraries/floor-u-value-calculator/scenario-spec';

describe('warning display', () => {
    it('handles a Floor model warning', () => {
        const arbWarnings = arbFloorSpec
            .map((spec) => new Floor(spec))
            .map((floor) => floor.warnings);
        fc.assert(
            fc.property(arbWarnings, (warnings) => {
                const warningsDisplay = warnings.map((w) => warningDisplay(w));
                expect(warningsDisplay).not.toContain(null);

                // Test for no duplication
                expect(Array.from(new Set(warningsDisplay)).sort()).toEqual(
                    warningsDisplay.sort(),
                );
            }),
            {
                numRuns: 10000,
            },
        );
    });
    it('handles a FUVC model warning', () => {
        const arbWarnings = arbFloorUValueModelInput()
            .map((input) => constructFloorUValueModel(input))
            .map((model) => model.warnings)
            .filter((warnings) => warnings.length !== 0);
        fc.assert(
            fc.property(arbWarnings, (warnings) => {
                const warningsDisplay = warnings.map((w) => warningDisplay(w));
                expect(warningsDisplay).not.toContain(null);

                // Test for no duplication
                expect(Array.from(new Set(warningsDisplay)).sort()).toEqual(
                    warningsDisplay.sort(),
                );
            }),
            { numRuns: 10000 },
        );
    });
});
