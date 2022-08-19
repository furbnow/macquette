import fc from 'fast-check';

import { FloorUValueWarning } from '../../../../src/v2/data-schemas/scenario/fabric/floor-u-value';
import { MiscellaneousNonFiniteNumberWarning } from '../../../../src/v2/data-schemas/scenario/validation';
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

    it('does not return NaN', () => {
        fc.assert(
            fc.property(arbFloorUValueModelInput(), (input) => {
                const model = constructFloorUValueModel(input);
                const uValue = model.uValue.unwrap(() => undefined);
                expect(uValue).not.toBeNaN();
            }),
            { numRuns: 1000 },
        );
    });

    it('does not return a warning about a miscellaneous non-finite u-value', () => {
        fc.assert(
            fc.property(arbFloorUValueModelInput(), (input) => {
                const model = constructFloorUValueModel(input);
                const warnings = new Set();
                model.uValue.unwrap((warning) => warnings.add(warning));
                const badWarningType: MiscellaneousNonFiniteNumberWarning['type'] =
                    'miscellaneous non-finite number';
                expect(warnings).not.toContainEqual(
                    expect.objectContaining({
                        type: badWarningType,
                        namespace: 'floor u-value calculator',
                    }),
                );
            }),
            { numRuns: 1000 },
        );
    });

    it('does not return duplicate warnings', () => {
        fc.assert(
            fc.property(arbFloorUValueModelInput(), (input) => {
                const model = constructFloorUValueModel(input);
                const warnings: Array<FloorUValueWarning> = [];
                model.uValue.unwrap((warning) => warnings.push(warning));
                warnings.forEach((warning, idx) => {
                    const restWarnings = warnings.slice(idx + 1);
                    expect(restWarnings).not.toContainEqual(warning);
                });
            }),
            { numRuns: 1000 },
        );
    });
});
