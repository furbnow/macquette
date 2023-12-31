/* eslint-disable jest/expect-expect */
import assert from 'assert';
import { cloneDeep } from 'lodash';
import { z } from 'zod';

import { scenarioSchema } from '../../src/data-schemas/scenario';
import { emulateJsonRoundTrip } from '../../src/helpers/emulate-json-round-trip';
import { calcRun } from '../../src/model/model';
import { scenarios } from '../fixtures';

function runModel(data: unknown): unknown {
  const oldConsoleWarn = console.warn;
  console.warn = () => undefined;
  try {
    return calcRun(cloneDeep(data));
  } finally {
    console.warn = oldConsoleWarn;
  }
}

describe('scenario schema', () => {
  describe('should be able to parse fixed & arbitrary data', () => {
    function testFn(scenarioData: unknown) {
      expect(() => scenarioSchema.parse(scenarioData)).not.toThrow();
    }
    test.each(scenarios)('$displayName', (scenario) => testFn(scenario.rawData));
  });

  describe('should be able to parse the output of running the model', () => {
    function testFn(scenarioData: unknown) {
      const modelOutput = runModel(scenarioData);
      expect(() => scenarioSchema.parse(modelOutput)).not.toThrow();
    }
    test.each(scenarios)('$displayName', (scenario) => testFn(scenario.rawData));
  });

  describe('should be able to parse the JSON round-tripped output of running the model', () => {
    function testFn(scenarioData: unknown) {
      const modelOutput = runModel(scenarioData);
      const jsonRoundTripped = emulateJsonRoundTrip(modelOutput);
      expect(() => scenarioSchema.parse(jsonRoundTripped)).not.toThrow();
    }
    test.each(scenarios)('$displayName', (scenario) => testFn(scenario.rawData));
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
      const res = scenarioSchema.safeParse(data);
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
      const modelOutput = runModel(scenarioData);
      testIdempotence(validate, modelOutput);
      const jsonRoundTripped = emulateJsonRoundTrip(modelOutput);
      testIdempotence(validate, jsonRoundTripped);
    }

    test.each(scenarios)('$displayName', (scenario) => testFn(scenario.rawData));

    test('type level idempotence check', () => {
      // Test that output is assignable to input. We don't want to
      // actually generate a runtime value of the schema output, so we
      // write the test inside a function that assumes we are given one.

      // It is fine that this function and the inner assignment are
      // unused at runtime, since this test is at the type-level.

      /* eslint-disable @typescript-eslint/no-unused-vars */
      function test(schemaParseOutput: z.output<typeof scenarioSchema>) {
        const input: z.input<typeof scenarioSchema> = schemaParseOutput;
      }
      /* eslint-enable */
    });
  });
});
