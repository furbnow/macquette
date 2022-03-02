import { calcRun } from '../../../src/v2/model/model';
import { cloneDeep, pick } from 'lodash';
import { calcRun as referenceCalcRun } from './reference-model';
import { scenarios } from '../fixtures';
import fc from 'fast-check';
import { arbScenario } from './arbitraries/scenario';
import {
    LegacyScenario,
    legacyScenarioSchema,
} from '../../../src/v2/legacy-state-validators/scenario';
import { FcInfer } from '../../helpers/arbitraries';
import { CompareFloatParams, compareFloats } from '../../helpers/fuzzy-float-equality';

const runModel = (data: any, calcRun: (data: any) => any) => {
    // Clone the input because calcRun will modify it in-place
    let out: any = cloneDeep(data);
    // We run the models twice because the legacy parts have some circular data
    // dependencies which stabilise after two runs
    out = calcRun(out);
    out = calcRun(out);
    out = normaliseScenario(out);
    return out;
};
const runLegacyModel = (data: any) => runModel(data, referenceCalcRun);
const runLiveModel = (data: any) => runModel(data, calcRun);

describe('golden master acceptance tests', () => {
    for (const scenario of scenarios) {
        test(`fixed data: ${scenario.name}`, () => {
            const legacyReference = runLegacyModel(scenario.data);
            expect(hasNoKnownBugs(legacyReference)).toBe(true);
            const actual = runLiveModel(scenario.data);
            expect(actual).toEqualBy(legacyReference, modelValueComparer());
        });
    }

    test('fast-check data', () => {
        const examples: Array<[FcInfer<typeof arbScenario>]> = [];
        fc.assert(
            fc.property(arbScenario(), (scenario) => {
                const legacyReference = runLegacyModel(scenario);
                fc.pre(hasNoKnownBugs(legacyReference));
                const actual = runLiveModel(scenario);
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
        // If a1 is a stringified number other than '' or '0' then bad things
        // happen in the legacy model. Also if a1 is '0' and a2 is negative.
        // Go on, try it. I dare you.
        (legacyScenario.SHW.a1 === undefined ||
            (legacyScenario.SHW.a1 === '0' && legacyScenario.a2 >= 0) ||
            legacyScenario.SHW.a1 === '' ||
            typeof legacyScenario.SHW.a1 === 'number') &&
        // Bad strings in fuels cause concatenation problems
        Object.values<any>(legacyScenario.fuels)
            .slice(0, legacyScenario.fuels.length - 1)
            .every(
                ({ standingcharge, fuelcost, co2factor, primaryenergyfactor }) =>
                    !willTriggerStringConcatenationBugs(standingcharge) &&
                    !willTriggerStringConcatenationBugs(fuelcost) &&
                    !willTriggerStringConcatenationBugs(co2factor) &&
                    !willTriggerStringConcatenationBugs(primaryenergyfactor),
            )
    );
};

const willTriggerStringConcatenationBugs = (val: unknown) => {
    return typeof val === 'string' && val !== '';
};

const modelValueComparer =
    (compareFloatParams?: CompareFloatParams) =>
    (received: unknown, expected: unknown): boolean => {
        if (
            Number.isNaN(expected) &&
            (typeof received === 'number' || received === null)
        ) {
            // If legacy gives us NaN, allow any numeric or null value in the new code
            return true;
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

// Mutate the scenario rather than deep-cloning it, for performance
const normaliseScenario = (scenario: LegacyScenario) => {
    // SHW normalisation
    if (scenario.SHW !== undefined) {
        const inputKeys = [
            'pump',
            'A',
            'n0',
            'a1',
            'a2',
            'orientation',
            'inclination',
            'overshading',
            'Vs',
            'combined_cylinder_volume',
        ] as const;
        const inputs = pick(scenario.SHW, ...inputKeys);
        const moduleIsDisabled = !(
            scenario.use_SHW || scenario.water_heating?.solar_water_heating
        );
        const inputIsIncomplete = inputKeys.reduce(
            (someInputWasUndefined, key) =>
                someInputWasUndefined || inputs[key] === undefined,
            false,
        );
        if (moduleIsDisabled || inputIsIncomplete) {
            // SHW module is disabled or input is incomplete, so we disregard
            // all its outputs. This is because the legacy model will partially
            // compute them, whereas it is more convenient for the new model to
            // simply skip the whole calculation. We preserve the inputs just
            // to make sure nothing untoward is happening with them.
            scenario.SHW = inputs;
        }
    }
    return scenario;
};
