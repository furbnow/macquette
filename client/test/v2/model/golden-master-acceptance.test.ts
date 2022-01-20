import { calcRun } from '../../../src/v2/model/model';
import { cloneDeep } from 'lodash';
import { calcRun as referenceCalcRun } from './reference-model';
import { scenarios } from '../fixtures';

describe('golden master acceptance tests', () => {
    for (const scenario of scenarios) {
        test(`${scenario.name}`, () => {
            const expected = referenceCalcRun(cloneDeep(scenario.data));
            const actual = calcRun(cloneDeep(scenario.data));
            expect(actual).toEqualApproximately(expected);
        });
    }
});
