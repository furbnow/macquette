import { scenarioSchema } from '../../../src/v2/legacy-state-validators/scenario';
import { scenarios } from '../fixtures';

describe('legacy scenario validator', () => {
    for (const scenario of scenarios) {
        test(`${scenario.name}`, () => {
            expect(() => scenarioSchema.parse(scenario.data)).not.toThrow();
        });
    }
});
