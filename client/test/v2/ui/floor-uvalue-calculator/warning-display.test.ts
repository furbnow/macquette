import fc from 'fast-check';

import { constructFloorUValueModel } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator';
import { validate } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator/validate-input';
import { warningDisplay } from '../../../../src/v2/ui/modules/floor-row/u-value-calculator/warnings';
import { arbFloorUValueModelInput } from '../../model/arbitraries/floor-u-value-calculator/model-input';
import {
    arbCommon,
    arbFloorType,
    arbPerFloorTypeSpec,
} from '../../model/arbitraries/floor-u-value-calculator/scenario-spec';

describe('warning display', () => {
    it('handles a validation warning', () => {
        const arbWarnings = fc
            .tuple(arbFloorType, arbCommon, arbPerFloorTypeSpec)
            .map((params) => validate(...params).inner()[1])
            .filter((warnings) => warnings.size !== 0)
            .map((warnings) => [...warnings]);
        fc.assert(
            fc.property(arbWarnings, (warnings) => {
                warnings.forEach((warning, idx) => {
                    expect(
                        warningDisplay(warning)
                            .mapErr(() => idx)
                            .coalesce(),
                    ).toMatch(/.*/);
                });
            }),
            { numRuns: 10000 },
        );
    });
    it('handles a model warning', () => {
        const arbWarnings = arbFloorUValueModelInput().map(
            (input) => constructFloorUValueModel(input).uValue.inner()[1],
        );
        fc.assert(
            fc.property(arbWarnings, (warnings) => {
                warnings.forEach((warning, idx) => {
                    expect(
                        warningDisplay(warning)
                            .mapErr(() => idx)
                            .coalesce(),
                    ).toMatch(/.*/);
                });
            }),
            { numRuns: 10000 },
        );
    });
});
