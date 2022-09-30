import fc from 'fast-check';

import { validate } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator/validate-input';
import { errorDisplay } from '../../../../src/v2/ui/modules/floor-row/u-value-calculator/errors';
import {
    arbCommon,
    arbFloorType,
    arbPerFloorTypeSpec,
} from '../../model/arbitraries/floor-u-value-calculator/scenario-spec';

describe('error display', () => {
    it('handles a validation error', () => {
        const arbError = fc
            .tuple(arbFloorType, arbCommon, arbPerFloorTypeSpec)
            .map((params) => validate(...params).unwrap(() => undefined))
            .filter((validationResult) => validationResult.isErr())
            .map((validationResult) => validationResult.unwrapErr());
        fc.assert(
            fc.property(arbError, (error) => {
                expect(errorDisplay(error).coalesce()).not.toBeNull();
            }),
            { numRuns: 5000 },
        );
    });
});
