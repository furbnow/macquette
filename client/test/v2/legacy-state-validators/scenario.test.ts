/* eslint-disable jest/expect-expect */
import { cloneDeep } from 'lodash';
import { emulateJsonRoundTrip } from '../../../src/v2/helpers/emulate-json-round-trip';
import { legacyScenarioSchema } from '../../../src/v2/legacy-state-validators/scenario';
import { calcRun } from '../../../src/v2/model/model';
import { scenarios, shouldSkipScenario } from '../fixtures';
import { arbScenarioInputs } from '../model/arbitraries/scenario';
import * as fc from 'fast-check';

describe('legacy scenario validator', () => {
    describe('scenario inputs', () => {
        const testFn = (scenarioData: unknown) => {
            expect(() => legacyScenarioSchema.parse(scenarioData)).not.toThrow();
        };
        test.each(scenarios)('$displayName', (scenario) => {
            if (shouldSkipScenario(scenario)) {
                return;
            }
            testFn(scenario.data);
        });
        test('arbitrary', () => {
            fc.assert(fc.property(arbScenarioInputs(), testFn));
        });
    });

    describe('after running calc.run', () => {
        const testFn = (scenarioData: unknown) => {
            const modelOutput = calcRun(cloneDeep(scenarioData));
            expect(() => legacyScenarioSchema.parse(modelOutput)).not.toThrow();
        };
        test.each(scenarios)('$displayName', (scenario) => testFn(scenario.data));
        test('arbitrary', () => {
            fc.assert(fc.property(arbScenarioInputs(), testFn));
        });
    });

    describe('after running calc.run and then JSON round-trip', () => {
        const testFn = (scenarioData: unknown) => {
            const modelOutput = calcRun(cloneDeep(scenarioData));
            const jsonRoundTripped = emulateJsonRoundTrip(modelOutput);
            expect(() => legacyScenarioSchema.parse(jsonRoundTripped)).not.toThrow();
        };
        test.each(scenarios)('$displayName', (scenario) => testFn(scenario.data));
        test('arbitrary', () => {
            fc.assert(fc.property(arbScenarioInputs(), testFn));
        });
    });
});
