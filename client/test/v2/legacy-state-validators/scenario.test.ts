/* eslint-disable jest/expect-expect */
import { cloneDeep } from 'lodash';
import { emulateJsonRoundTrip } from '../../../src/v2/helpers/emulate-json-round-trip';
import { legacyScenarioSchema } from '../../../src/v2/legacy-state-validators/scenario';
import { calcRun } from '../../../src/v2/model/model';
import { scenarios, shouldSkipScenario } from '../fixtures';
import { arbScenarioInputs } from '../model/arbitraries/scenario';
import * as fc from 'fast-check';
import assert from 'assert';

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

    describe('idempotence', () => {
        // Idempotence is necessary because we want to be able to assign chunks
        // of the post-validation scenario back into the legacy scenario
        // object, until we have a better solution for managing scenario state
        // globally. Therefore, we must test that these new-style chunks are
        // not corrupted when run back through the validator.

        function testIdempotence<T>(fn: (input: T) => T, input: T) {
            const firstPass = fn(input);
            const secondPass = fn(firstPass);
            expect(secondPass).toEqual(firstPass);
        }

        function validate(data: unknown) {
            const res = legacyScenarioSchema.safeParse(data);
            if (!res.success) {
                // Throwing the ZodError here results in V8 running out of
                // memory, so we fake it by logging the message and doing an
                // assert(false)
                console.error(res.error.message);
                assert(false);
            }
            return res.data;
        }

        function testFn(scenarioData: unknown) {
            testIdempotence(validate, scenarioData);
            const modelOutput = calcRun(cloneDeep(scenarioData));
            testIdempotence(validate, modelOutput);
            const jsonRoundTripped = emulateJsonRoundTrip(modelOutput);
            testIdempotence(validate, jsonRoundTripped);
        }

        test.each(scenarios)('$displayName', (scenario) => testFn(scenario.data));
        test('arbitrary', () => {
            fc.assert(fc.property(arbScenarioInputs(), testFn));
        });
    });
});
