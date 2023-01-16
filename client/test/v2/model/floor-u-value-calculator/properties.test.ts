import fc from 'fast-check';

import { constructFloorUValueModel } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator';
import { FloorUValueModelInput } from '../../../../src/v2/model/modules/fabric/floor-u-value-calculator/input-types';
import { arbFloorUValueModelInput } from '../arbitraries/floor-u-value-calculator/model-input';

describe('floor u-value model property tests', () => {
    it('does not throw any errors', () => {
        const examples: Array<[FloorUValueModelInput]> = [];
        fc.assert(
            fc.property(arbFloorUValueModelInput(), (input) => {
                const model = constructFloorUValueModel(input);
                expect(() => model.uValue).not.toThrow();
            }),
            { examples },
        );
    });

    it('does not return non-finite U-values', () => {
        // This is so that the subsequent steps of the model can continue to
        // operate even if the FUVC has nonsense parameters
        fc.assert(
            fc.property(arbFloorUValueModelInput(), (input) => {
                const model = constructFloorUValueModel(input);
                expect(Number.isFinite(model.uValue)).toBe(true);
            }),
            { numRuns: 1000 },
        );
    });

    it('does not return duplicate warnings', () => {
        // For future developers: if you have written something that makes this
        // test fail, it can usually be solved by a judicious application of
        // @cache decorators on methods that are called more than once.

        fc.assert(
            fc.property(arbFloorUValueModelInput(), (input) => {
                const model = constructFloorUValueModel(input);
                const warnings = model.warnings;
                warnings.forEach((warning, idx) => {
                    const restWarnings = warnings.slice(idx + 1);
                    expect(restWarnings).not.toContainEqual(warning);
                });
            }),
            { numRuns: 1000 },
        );
    });
});
