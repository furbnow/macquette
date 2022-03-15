import { calcRun } from '../../../src/v2/model/model';
import { cloneDeep, pick } from 'lodash';
import { calcRun as referenceCalcRun } from './reference-model';
import { scenarios, shouldSkipScenario } from '../fixtures';
import fc from 'fast-check';
import { arbScenario, SHWInputKeys } from './arbitraries/scenario';
import { legacyScenarioSchema } from '../../../src/v2/legacy-state-validators/scenario';
import { FcInfer } from '../../helpers/arbitraries';
import { CompareFloatParams, compareFloats } from '../../helpers/fuzzy-float-equality';

const runModel = (data: any, calcRun: (data: any) => any) => {
    // Clone the input because calcRun will modify it in-place
    let out: any = cloneDeep(data);
    // We run the models twice because the legacy parts have some circular data
    // dependencies which stabilise after two runs
    out = calcRun(out);
    out = calcRun(out);
    return out;
};
const runLegacyModel = (data: any) => runModel(data, referenceCalcRun);
const runLiveModel = (data: any) => runModel(data, calcRun);

describe('golden master acceptance tests', () => {
    test.each(scenarios)('fixed data: $displayName', (scenario) => {
        if (shouldSkipScenario(scenario)) {
            return;
        }
        const legacyReference = runLegacyModel(cloneDeep(scenario.data));
        expect(hasNoKnownBugs(legacyReference)).toEqual(
            expect.objectContaining({
                bugs: false,
            }),
        );
        const actual = runLiveModel(cloneDeep(scenario.data));
        expect(normaliseScenario(actual)).toEqualBy(
            normaliseScenario(legacyReference),
            modelValueComparer(),
        );
    });

    test('fast-check data', () => {
        const examples: Array<[FcInfer<typeof arbScenario>]> = [];
        fc.assert(
            fc.property(arbScenario(), (scenario) => {
                const legacyReference = runLegacyModel(scenario);
                fc.pre(!hasNoKnownBugs(legacyReference).bugs);
                const actual = runLiveModel(scenario);
                expect(normaliseScenario(actual)).toEqualBy(
                    normaliseScenario(legacyReference),
                    modelValueComparer(),
                );
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

const isValidStringyFloat = (value: unknown) => {
    return (
        typeof value === 'number' ||
        (typeof value === 'string' && !Number.isNaN(stricterParseFloat(value)))
    );
};

const hasNoKnownBugs = (legacyScenario: any) => {
    const noFabricBugs =
        isValidStringyFloat(legacyScenario.fabric.total_external_area) &&
        isValidStringyFloat(legacyScenario.fabric.total_floor_area) &&
        isValidStringyFloat(legacyScenario.fabric.total_party_wall_area) &&
        isValidStringyFloat(legacyScenario.fabric.total_roof_area) &&
        isValidStringyFloat(legacyScenario.fabric.total_wall_area) &&
        isValidStringyFloat(legacyScenario.fabric.total_window_area) &&
        isValidStringyFloat(legacyScenario.TFA);

    const solarHotWaterStringConcatenationBug = (): 'bug' | 'no bug' => {
        const { a1, a2 } = legacyScenario.SHW;
        if (typeof a1 !== 'string') return 'no bug';
        if (a1 === '0' && a2 >= 0) return 'no bug';
        if (a1 === '') return 'no bug';
        return 'bug';
    };

    const ventilationStringConcatenationBug = (): 'bug' | 'no bug' => {
        const { system_air_change_rate, ventilation_type } = legacyScenario.ventilation;
        if (ventilation_type !== 'MV') return 'no bug';
        if (typeof system_air_change_rate !== 'string') return 'no bug';
        if (system_air_change_rate === '') return 'no bug';
        return 'bug';
    };

    const floorAreaStringConcatenationBug = (): 'bug' | 'no bug' => {
        const floorsInit: Array<{ area: string | number }> = legacyScenario.floors.slice(
            0,
            legacyScenario.floors.length - 1,
        );
        if (floorsInit.some((floor) => typeof floor.area === 'string')) return 'bug';
        return 'no bug';
    };

    const noStringConcatenationBugs =
        // Wide spectrum
        !Number.isNaN(stricterParseFloat(legacyScenario.total_cost)) &&
        // Specifics
        solarHotWaterStringConcatenationBug() === 'no bug' &&
        ventilationStringConcatenationBug() === 'no bug' &&
        floorAreaStringConcatenationBug() === 'no bug';

    const noVentilationBugs =
        // if num_of_floors_override is 0, legacy treats it as undefined (i.e.
        // no override)
        legacyScenario.num_of_floors_override !== 0 &&
        !Number.isNaN(legacyScenario.ventilation.average_WK);

    if (!noFabricBugs) {
        return { bugs: true, type: 'fabric bugs' };
    }
    if (!noStringConcatenationBugs) {
        return { bugs: true, type: 'string concatenation bugs' };
    }
    if (!noVentilationBugs) {
        return { bugs: true, type: 'ventilation bugs' };
    }
    return { bugs: false };
};

const heuristicTypeOf = (value: unknown) => {
    if (typeof value === 'number') {
        return { type: 'number' as const, value };
    }
    if (typeof value === 'string') {
        const parsed = stricterParseFloat(value);
        if (Number.isNaN(parsed)) {
            if (/^[\d\-.e]+$/.test(value)) {
                // String was not a parseable number, but only contained
                // characters found in floating point numbers. Suspicious...
                return { type: 'string concatenation bug' as const, value };
            } else {
                return { type: 'non-numeric string' as const, value };
            }
        } else {
            return { type: 'stringified number' as const, value: parsed };
        }
    }
    return { type: 'unknown' as const, value };
};
const modelValueComparer =
    (compareFloatParams?: CompareFloatParams) =>
    (receivedLive: unknown, expectedLegacy: unknown): boolean => {
        // First, detect some special cases
        if (expectedLegacy === '' && receivedLive === 0) {
            return true;
        }
        if (expectedLegacy === 1 && receivedLive === true) {
            return true;
        }
        if (
            Number.isNaN(expectedLegacy) &&
            (typeof receivedLive === 'number' || receivedLive === null)
        ) {
            // If legacy gives us NaN, allow any numeric or null value in the new code
            return true;
        }

        // Then try and ascertain what kind of type the parameters are.
        const heuristicLive = heuristicTypeOf(receivedLive);
        const heuristicLegacy = heuristicTypeOf(expectedLegacy);

        // If either of them are non-number and non-string, use Object.is
        if (heuristicLive.type === 'unknown' || heuristicLegacy.type === 'unknown') {
            return Object.is(receivedLive, expectedLegacy);
        }

        /*
            Now the fun stuff. We want to detect if stringy values are
            stringified numbers, nonsense strings resulting from string
            concatenation bugs, or legitimate strings, and do some combination
            of blind acceptance, blind rejection, numeric string parsing,
            floating point comparison, and Object.is comparison, depending on
            what we find.

            Here is a case table for what comparison function to use, excluding
            the above special cases. Note that it is not symmetrical. Simple,
            right?!

                  Legacy → | stringy    | number     | non-numeric | numeric string |
             Live ↓        | number     |            | string      | concat bug     |
            ---------------+------------+------------+-------------+----------------+
            stringy        | parse,     |   false    |    false    |      true      |
            number         | fp compare |            |             |                |
            ---------------+------------+------------+-------------+----------------+
            number         | parse,     | fp compare |    false    |      true      |
                           | fp compare |            |             |                |
            ---------------+------------+------------+-------------+----------------+
            non-numeric    |   false    |   false    |  Object.is  |     false      |
            string         |            |            |             |                |
            ---------------+------------+------------+-------------+----------------+
            numeric string |   false    |   false    |    false    |      true      |
            concat bug     |            |            |             |                |
            ---------------+------------+------------+-------------+----------------+
        */
        switch (heuristicLegacy.type) {
            case 'stringified number': {
                if (
                    heuristicLive.type === 'non-numeric string' ||
                    heuristicLive.type === 'string concatenation bug'
                ) {
                    return false;
                } else {
                    return compareFloats(compareFloatParams)(
                        heuristicLive.value,
                        heuristicLegacy.value,
                    );
                }
            }
            case 'number': {
                if (heuristicLive.type === 'number') {
                    return compareFloats(compareFloatParams)(
                        heuristicLive.value,
                        heuristicLegacy.value,
                    );
                } else {
                    return false;
                }
            }
            case 'non-numeric string': {
                if (heuristicLive.type === 'non-numeric string') {
                    return Object.is(heuristicLive.value, heuristicLegacy.value);
                } else {
                    return false;
                }
            }
            case 'string concatenation bug': {
                return heuristicLive.type !== 'non-numeric string';
            }
        }
    };

// Mutate the scenario rather than deep-cloning it, for performance
const normaliseScenario = (scenario: any) => {
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
        const { LAC } = scenario;
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
    delete scenario.appliancelist;

    // Ventilation
    const { ventilation } = scenario;
    if (ventilation !== undefined) {
        // Ignore certain values depending on whether infiltration was
        // calculated from a pressure test or not
        if (ventilation.air_permeability_test) {
            delete ventilation.structural_infiltration;
        } else {
            delete ventilation.structural_infiltration_from_test;
        }
    }

    return scenario;
};

const stricterParseFloat = (s: string): number => {
    // Returns NaN in more cases than parseFloat
    return 1.0 * (s as any);
};
