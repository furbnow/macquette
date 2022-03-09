import { calcRun } from '../../../src/v2/model/model';
import { cloneDeep, pick } from 'lodash';
import { calcRun as referenceCalcRun } from './reference-model';
import { scenarios, shouldSkipScenario } from '../fixtures';
import fc from 'fast-check';
import { arbScenario, SHWInputKeys } from './arbitraries/scenario';
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
    test.each(scenarios)('fixed data: $name', (scenario) => {
        if (shouldSkipScenario(scenario)) {
            return;
        }
        const legacyReference = runLegacyModel(cloneDeep(scenario.data));
        expect(hasNoKnownBugs(legacyReference)).toBe(true);
        const actual = runLiveModel(cloneDeep(scenario.data));
        expect(actual).toEqualBy(legacyReference, modelValueComparer());
    });

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
    const noStringConcatenationBugs =
        // Wide spectrum
        !Number.isNaN(1.0 * legacyScenario.total_cost) &&
        // Catch a specific SHW string concatenation bug
        (legacyScenario.SHW.a1 === undefined ||
            (legacyScenario.SHW.a1 === '0' && legacyScenario.a2 >= 0) ||
            legacyScenario.SHW.a1 === '' ||
            typeof legacyScenario.SHW.a1 === 'number');

    return (
        isValidStringyFloat(legacyScenario.fabric.total_external_area) &&
        isValidStringyFloat(legacyScenario.fabric.total_floor_area) &&
        isValidStringyFloat(legacyScenario.fabric.total_party_wall_area) &&
        isValidStringyFloat(legacyScenario.fabric.total_roof_area) &&
        isValidStringyFloat(legacyScenario.fabric.total_wall_area) &&
        isValidStringyFloat(legacyScenario.fabric.total_window_area) &&
        isValidStringyFloat(legacyScenario.TFA) &&
        noStringConcatenationBugs
    );
};

const modelValueComparer =
    (compareFloatParams?: CompareFloatParams) =>
    (receivedLive: unknown, expectedLegacy: unknown): boolean => {
        if (
            Number.isNaN(expectedLegacy) &&
            (typeof receivedLive === 'number' || receivedLive === null)
        ) {
            // If legacy gives us NaN, allow any numeric or null value in the new code
            return true;
        }
        if (typeof receivedLive === 'number' && typeof expectedLegacy === 'number') {
            return compareFloats(compareFloatParams)(receivedLive, expectedLegacy);
        }
        if (typeof expectedLegacy === 'string' && typeof receivedLive === 'string') {
            // Check if values were numbers encoded as strings and if so
            // compare them as floats. Use 1.0 * x to convert to float because
            // it is less tolerant to string concatenation bugs than
            // parseFloat()
            const expectedLegacyFloat = 1.0 * (expectedLegacy as any);
            const receivedLiveFloat = 1.0 * (receivedLive as any);
            if (!Number.isNaN(expectedLegacyFloat) && !Number.isNaN(receivedLiveFloat)) {
                return compareFloats(compareFloatParams)(
                    receivedLiveFloat,
                    expectedLegacyFloat,
                );
            }
        }
        if (expectedLegacy === '' && receivedLive === 0) {
            return true;
        }
        if (typeof expectedLegacy === 'string' && typeof receivedLive === 'number') {
            return compareFloats(compareFloatParams)(
                receivedLive,
                parseFloat(expectedLegacy),
            );
        }
        if (receivedLive === true && expectedLegacy === 1) {
            return true;
        }
        return Object.is(receivedLive, expectedLegacy);
    };

// Mutate the scenario rather than deep-cloning it, for performance
const normaliseScenario = (scenario: LegacyScenario) => {
    // SHW normalisation
    if (scenario.SHW !== undefined) {
        const inputs = pick(scenario.SHW, ...SHWInputKeys);
        const moduleIsDisabled = !(
            scenario.use_SHW || scenario.water_heating?.solar_water_heating
        );
        const inputIsIncomplete = SHWInputKeys.reduce(
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

    // If using carbon coop mode for the appliances and cooking modules, remove
    // variables that are added by legacy but never used
    if (scenario.LAC_calculation_type === 'carboncoop_SAPlighting') {
        const { LAC } = scenario as any;
        delete LAC.EA;
        delete LAC.energy_efficient_appliances;
        delete LAC.fuels_appliances;
        delete LAC.EC;
        delete LAC.EC_monthly;
        delete LAC.GC;
        delete LAC.energy_efficient_cooking;
        delete LAC.fuels_cooking;
    }

    // Legacy property added by removed LAC "detailedlist" module
    delete (scenario as any).appliancelist;

    return scenario;
};
