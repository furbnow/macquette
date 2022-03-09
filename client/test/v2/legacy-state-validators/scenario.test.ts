import { cloneDeep } from 'lodash';
import { legacyScenarioSchema } from '../../../src/v2/legacy-state-validators/scenario';
import { calcRun } from '../../../src/v2/model/model';
import { scenarios, shouldSkipScenario } from '../fixtures';

describe('legacy scenario validator', () => {
    describe('parsed JSON scenarios', () => {
        test.each(scenarios)('$displayName', (scenario) => {
            if (shouldSkipScenario(scenario)) {
                return;
            }
            expect(() => legacyScenarioSchema.parse(scenario.data)).not.toThrow();
        });
    });

    describe('after running calc.run', () => {
        test.each(scenarios)('$displayName', (scenario) => {
            const modelOutput = calcRun(cloneDeep(scenario));
            expect(() => legacyScenarioSchema.parse(modelOutput)).not.toThrow();
        });
    });
});
