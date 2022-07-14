import fc from 'fast-check';

import { constructFloorUValueModel } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator';
import { warningDisplay } from '../../../../src/v2/ui/modules/floor-row/u-value-calculator/warnings';
import { arbFloorUValueModelInput } from '../../model/arbitraries/floor-u-value-calculator/model-input';

describe('warning display', () => {
    it('handles a model warning', () => {
        const arbWarnings = arbFloorUValueModelInput()
            .map((input) => constructFloorUValueModel(input).uValue.inner()[1])
            .filter((warnings) => warnings.size !== 0)
            .map((warnings) => [...warnings]);
        fc.assert(
            fc.property(arbWarnings, (warnings) => {
                for (const warning of warnings) {
                    expect(warningDisplay(warning).coalesce()).not.toBeNull();
                }
            }),
            { numRuns: 10000 },
        );
    });
});
