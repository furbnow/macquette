import { calcRun } from '../../../src/v2/model/model';
import { cloneDeep } from 'lodash';
import { calcRun as referenceCalcRun } from './reference-model';
import { scenarios } from '../fixtures';
import fc from 'fast-check';
import { arbScenario } from './arbitraries/scenario';
import { legacyScenarioSchema } from '../../../src/v2/legacy-state-validators/scenario';
import { FcInfer } from '../../helpers/arbitraries';
import { CompareFloatParams, compareFloats } from '../../helpers/fuzzy-float-equality';

describe('golden master acceptance tests', () => {
    for (const scenario of scenarios) {
        test(`fixed data: ${scenario.name}`, () => {
            const legacyReference = referenceCalcRun(cloneDeep(scenario.data));
            expect(hasNoKnownBugs(legacyReference)).toBe(true);
            const actual = calcRun(cloneDeep(scenario.data));
            expect(actual).toEqualApproximately(legacyReference);
        });
    }

    test('fast-check data', () => {
        const examples: Array<[FcInfer<ReturnType<typeof arbScenario>>]> = [];
        fc.assert(
            fc.property(arbScenario(), (scenario) => {
                const legacyReference = referenceCalcRun(cloneDeep(scenario));
                fc.pre(hasNoKnownBugs(legacyReference));
                const actual = calcRun(cloneDeep(scenario));
                expect(actual).toEqualBy(legacyReference, modelValueComparer());
            }),
            {
                examples,
            },
        );
    });

    test('scenario schema validates fast-check arbitrary', () => {
        fc.assert(
            fc.property(arbScenario(), (scenario) => {
                expect(() => legacyScenarioSchema.parse(scenario)).not.toThrow();
            }),
        );
    });
});

const floatingPointString = /^-?([1-9]\d*|0)(\.\d*[1-9])?$/;
const isValidStringyFloat = (value: unknown) => {
    return (
        typeof value === 'number' ||
        (typeof value === 'string' && floatingPointString.test(value))
    );
};

const hasNoKnownBugs = (legacyScenario: any) => {
    return (
        isValidStringyFloat(legacyScenario.fabric.total_external_area) &&
        isValidStringyFloat(legacyScenario.fabric.total_floor_area) &&
        isValidStringyFloat(legacyScenario.fabric.total_party_wall_area) &&
        isValidStringyFloat(legacyScenario.fabric.total_roof_area) &&
        isValidStringyFloat(legacyScenario.fabric.total_wall_area) &&
        isValidStringyFloat(legacyScenario.fabric.total_window_area) &&
        isValidStringyFloat(legacyScenario.TFA) &&
        true
    );
};

const modelValueComparer =
    (compareFloatParams?: CompareFloatParams) =>
    (received: unknown, expected: unknown): boolean => {
        if (Number.isNaN(expected) && typeof received === 'number') {
            return true; // If legacy gives us NaN, anything goes in the new code
        }
        if (typeof received === 'number' && typeof expected === 'number') {
            return compareFloats(compareFloatParams)(received, expected);
        }
        if (expected === '' && received === 0) {
            return true;
        }
        if (typeof expected === 'string' && typeof received === 'number') {
            return compareFloats(compareFloatParams)(received, parseFloat(expected));
        }
        return Object.is(received, expected);
    };
