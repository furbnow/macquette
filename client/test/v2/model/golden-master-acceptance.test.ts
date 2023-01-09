import fc from 'fast-check';
import { cloneDeep, defaults, pick } from 'lodash';

import { scenarioSchema } from '../../../src/v2/data-schemas/scenario';
import { SolarHotWaterV1 } from '../../../src/v2/data-schemas/scenario/solar-hot-water';
import { assertNever } from '../../../src/v2/helpers/assert-never';
import {
    CompareFloatParams,
    compareFloats,
} from '../../../src/v2/helpers/fuzzy-float-equality';
import { isTruthy } from '../../../src/v2/helpers/is-truthy';
import { calcRun } from '../../../src/v2/model/model';
import { setDefaultLegacyInputs } from '../../../src/v2/model/modules/legacy-initialisation';
import { FcInfer } from '../../helpers/arbitraries';
import { stricterParseFloat } from '../../helpers/stricter-parse-float';
import { scenarios, shouldSkipScenario } from '../fixtures';
import { arbScenarioInputs } from './arbitraries/scenario';
import {
    shwLegacyInputKeys,
    shwInputIsComplete,
    shwInputs,
} from './arbitraries/solar-hot-water';
import { calcRun as referenceCalcRun } from './reference-model';
import { checkInputBugs, checkOutputBugs, hasNewBehaviour } from './scenario-predicates';

function runModel(data: any, calcRun: (data: any) => any) {
    // Clone the input because calcRun will modify it in-place
    let out: any = cloneDeep(data);
    // We run the models twice because the legacy parts have some circular data
    // dependencies which stabilise after two runs
    out = calcRun(out);
    out = calcRun(out);
    return out;
}
function runLegacyModel(data: any) {
    return runModel(data, referenceCalcRun);
}
function runLiveModel(data: any) {
    return runModel(data, calcRun);
}

// const focussedScenariosSpec: [string, string][] = [['private/950.json', 'master']];
const focussedScenariosSpec: [string, string][] = [];
const focussedScenarios = scenarios.filter(
    (s) =>
        focussedScenariosSpec.length === 0 ||
        focussedScenariosSpec.find(
            ([path, name]) => path === s.fixturePath && name === s.scenarioName,
        ) !== undefined,
);

describe('golden master acceptance tests', () => {
    beforeAll(() => {
        // Suppress warnings for this test suite. Jest runs each suite in its
        // own process, so no need to clean up.
        console.warn = jest.fn();
    });

    test('all scenarios are included in tests', () => {
        // This test is to make sure we don't commit a focussed test suite to main
        expect(focussedScenarios).toHaveLength(scenarios.length);
    });

    test.each(focussedScenarios)('fixed data: $displayName', (scenario) => {
        if (shouldSkipScenario(scenario)) {
            return;
        }
        if (hasNewBehaviour(scenario.rawData as any)) {
            console.warn(`Skipping scenario for new behaviour: ${scenario.displayName}`);
            return;
        }
        expect(checkInputBugs(scenario.rawData as any)).toEqual(
            expect.objectContaining({
                bugs: false,
            }),
        );
        const legacyReference = runLegacyModel(cloneDeep(scenario.rawData));
        expect(checkOutputBugs(legacyReference)).toEqual(
            expect.objectContaining({
                bugs: false,
            }),
        );
        const actual = runLiveModel(cloneDeep(scenario.rawData));
        expect(normaliseScenario(actual)).toEqualBy(
            normaliseScenario(legacyReference),
            modelValueComparer(),
        );
    });

    test('fast-check data', () => {
        const examples: Array<[FcInfer<typeof arbScenarioInputs>]> = [];

        fc.assert(
            fc.property(
                arbScenarioInputs().filter(
                    (inputs) => !hasNewBehaviour(inputs) && !checkInputBugs(inputs).bugs,
                ),
                (scenario) => {
                    const legacyReference = runLegacyModel(scenario);
                    fc.pre(!checkOutputBugs(legacyReference).bugs);
                    const actual = runLiveModel(scenario);
                    const actualNormalised = normaliseScenario(actual);
                    const legacyReferenceNormalised = normaliseScenario(legacyReference);
                    expect(actualNormalised).toEqualBy(
                        legacyReferenceNormalised,
                        modelValueComparer(),
                    );
                },
            ),
            {
                ...(isTruthy(process.env['CI']) ? { numRuns: 500 } : {}),
                examples,
            },
        );
    });

    test('scenario schema validates fast-check arbitrary', () => {
        fc.assert(
            fc.property(arbScenarioInputs(), (scenario) => {
                expect(() => scenarioSchema.parse(scenario)).not.toThrow();
            }),
        );
    });
});

function heuristicTypeOf(value: unknown) {
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
}

function modelValueComparer(compareFloatParams?: CompareFloatParams) {
    return (
        _path: string,
        receivedMissing: boolean,
        receivedLive: unknown,
        expectedMissing: boolean,
        expectedLegacy: unknown,
    ): boolean => {
        if (receivedMissing || expectedMissing) {
            return false;
        }

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
                    return compareFloats(
                        heuristicLive.value,
                        heuristicLegacy.value,
                        compareFloatParams,
                    );
                }
            }
            case 'number': {
                if (heuristicLive.type === 'number') {
                    return compareFloats(
                        heuristicLive.value,
                        heuristicLegacy.value,
                        compareFloatParams,
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
}

// Mutate the scenario rather than deep-cloning it, for performance
function normaliseScenario(scenario: any) {
    type SHWOutputs = Omit<SolarHotWaterV1, 'input' | 'pump' | 'version'>;
    const castScenario = scenario as {
        SHW: FcInfer<typeof shwInputs> & SHWOutputs;
        LAC_calculation_type: string;
        LAC: any;
        appliancelist?: unknown;
        ventilation?: any;
        space_heating?: any;
        energy_requirements?: {
            space_heating?: {
                monthly?: number[];
            };
            space_cooling?: any;
            appliances?: any;
            cooking?: any;
        };
        fabric?: {
            elements?: Array<{ uValueModelOutput?: unknown }>;
        };
        applianceCarbonCoop?: {
            energy_demand_by_type_of_fuel: unknown;
            gains_W?: unknown;
            gains_W_monthly?: unknown;
        };
        gains_W?: Record<string, unknown>;
        fuel_requirements?: {
            lighting?: {
                list?: Array<{
                    system_efficiency?: number;
                }>;
            };
            appliances?: {
                list?: Array<{
                    system_efficiency?: number;
                }>;
            };
            cooking?: {
                list?: Array<{
                    system_efficiency?: number;
                }>;
            };
        };
        model?: unknown;
        generation?: {
            total_income?: unknown;
            systems?: Record<
                'solarpv' | 'wind' | 'hydro',
                {
                    fraction_used_onsite?: unknown;
                }
            >;
        };
    };

    // Delete pointer to instantiated new model
    delete castScenario.model;

    // Set default inputs if none are set
    setDefaultLegacyInputs(castScenario);

    // Delete new U-value model output
    if (castScenario.fabric !== undefined && castScenario.fabric.elements !== undefined) {
        for (const element of castScenario.fabric.elements) {
            delete element.uValueModelOutput;
        }
    }

    // SHW normalisation
    if (castScenario.SHW !== undefined) {
        const moduleIsDisabled = !(
            scenario.use_SHW || scenario.water_heating?.solar_water_heating
        );
        if (moduleIsDisabled || !shwInputIsComplete(castScenario.SHW)) {
            // SHW module is disabled or input is incomplete, so we disregard
            // all its outputs. This is because the legacy model will partially
            // compute them, whereas it is more convenient for the new model to
            // simply skip the whole calculation. We preserve the inputs just
            // to make sure nothing untoward is happening with them.
            if (!('version' in castScenario.SHW)) {
                castScenario.SHW = pick(castScenario.SHW, ...shwLegacyInputKeys);
            } else {
                switch (castScenario.SHW.version) {
                    case 1: {
                        castScenario.SHW = pick(castScenario.SHW, [
                            'version',
                            'pump',
                            'input',
                        ]);
                        break;
                    }
                    default: {
                        assertNever(castScenario.SHW.version);
                    }
                }
            }
        }
    }

    if (castScenario.LAC_calculation_type === 'carboncoop_SAPlighting') {
        // If using carbon coop mode for the appliances and cooking modules,
        // remove variables that are added by legacy but never used
        const { LAC } = castScenario;
        delete LAC.EA;
        delete LAC.energy_efficient_appliances;
        delete LAC.fuels_appliances;
        delete LAC.EC;
        delete LAC.EC_monthly;
        delete LAC.GC;
        delete LAC.energy_efficient_cooking;
        delete LAC.fuels_cooking;

        // The old model conditionally sets various things if they are
        // non-zero, whereas the new one sets them to 0 explicitly. So if the
        // things in question are undefined, set them to 0 for parity between
        // old and new models.
        defaults(castScenario.applianceCarbonCoop!.energy_demand_by_type_of_fuel, {
            Electricity: 0,
            Oil: 0,
            Gas: 0,
        });

        if (castScenario.gains_W!['Appliances'] === undefined) {
            castScenario.gains_W!['Appliances'] = new Array<number>(12).fill(0);
        }
        if (castScenario.gains_W!['Cooking'] === undefined) {
            castScenario.gains_W!['Cooking'] = new Array<number>(12).fill(0);
        }
        if (castScenario.energy_requirements!.appliances === undefined) {
            castScenario.energy_requirements!.appliances = {
                name: 'Appliances',
                quantity: 0,
                monthly: new Array<number>(12).fill(0),
            };
        }
        if (castScenario.energy_requirements!.cooking === undefined) {
            castScenario.energy_requirements!.cooking = {
                name: 'Cooking',
                quantity: 0,
                monthly: new Array<number>(12).fill(0),
            };
        }
        delete castScenario.applianceCarbonCoop!.gains_W;
        delete castScenario.applianceCarbonCoop!.gains_W_monthly;
    } else if (castScenario.LAC_calculation_type === 'SAP') {
        // Vice versa for SAP mode
        delete castScenario.applianceCarbonCoop;
    }
    // In any case, delete "system_efficiency" key on fuels because it's set weirdly and nothing looks at it
    for (const item of [
        ...(castScenario.fuel_requirements?.lighting?.list ?? []),
        ...(castScenario.fuel_requirements?.appliances?.list ?? []),
        ...(castScenario.fuel_requirements?.cooking?.list ?? []),
        ...(castScenario.LAC?.fuels_lighting ?? []),
        ...(castScenario.LAC?.fuels_appliances ?? []),
        ...(castScenario.LAC?.fuels_cooking ?? []),
    ]) {
        delete item.system_efficiency;
    }

    // Legacy property added by removed LAC "detailedlist" module
    delete castScenario.appliancelist;

    // Ventilation
    const { ventilation } = castScenario;
    if (ventilation !== undefined) {
        // Ignore certain values depending on whether infiltration was
        // calculated from a pressure test or not
        if (ventilation.air_permeability_test) {
            delete ventilation.structural_infiltration;
        } else {
            delete ventilation.structural_infiltration_from_test;
        }
    }

    // Space heating
    // Because the space heating module involves subtracting floating point
    // numbers of arbitrary magnitude, it is easy for FP precision errors to
    // become significant.
    //
    // One example is the annual space heating and cooling demands, which are
    // compared to 0 to decide whether to set certain keys. Consider the
    // following example:
    //
    // Total losses = 40,000.00001
    // Useful gains = 40,000
    // Space heating demand = 0.00001
    // Demand > 0, therefore add the key.
    //
    // The new (or legacy) model may have both of these numbers as exactly
    // equal and therefore demand = 0, therefore do not add the key.
    //
    // Therefore we check the annual space heating and cooling demands here,
    // and if they are *close to* 0, we remove the key so that they cannot be
    // compared.
    const { space_heating, energy_requirements } = castScenario;
    if (compareFloats(space_heating.annual_heating_demand, 0)) {
        delete castScenario.energy_requirements?.space_heating;
    }
    if (compareFloats(space_heating.annual_cooling_demand, 0)) {
        delete castScenario.energy_requirements?.space_cooling;
    }
    /** If the value is close to zero in the scale provided by a reference value, return 0, otherwise return the value */
    function normaliseZero(value: number, scaleReference: number) {
        if (
            compareFloats(value, 0, {
                absoluteToleranceAroundZero: scaleReference * Math.pow(10, -8),
            })
        ) {
            return 0;
        } else {
            return value;
        }
    }
    for (let month = 0; month < 12; month++) {
        space_heating.heat_demand[month] = normaliseZero(
            space_heating.heat_demand[month],
            space_heating.total_losses[month],
        );
        space_heating.heat_demand_kwh[month] = normaliseZero(
            space_heating.heat_demand_kwh[month],
            space_heating.total_losses[month],
        );
        if (energy_requirements?.space_heating?.monthly !== undefined) {
            energy_requirements.space_heating.monthly[month] = normaliseZero(
                energy_requirements.space_heating.monthly[month]!,
                space_heating.total_losses[month],
            );
        }
    }

    // Generation

    // If generation.systems.*.fraction_used_onsite is present and set to
    // undefined, set it to the relevant default - it's copied in from the
    // input, which is defaulted in the new model but not in the old
    for (const systemName of ['solarpv', 'wind', 'hydro'] as const) {
        const systemObject = (castScenario?.generation?.systems ?? {})[systemName];
        if (
            systemObject !== undefined &&
            'fraction_used_onsite' in systemObject &&
            systemObject.fraction_used_onsite === undefined
        ) {
            systemObject.fraction_used_onsite = systemName === 'solarpv' ? 0.25 : 0.5;
        }
    }

    if (
        castScenario?.generation !== undefined &&
        castScenario.generation.total_income === undefined
    ) {
        castScenario.generation.total_income = 0;
    }

    return castScenario;
}
