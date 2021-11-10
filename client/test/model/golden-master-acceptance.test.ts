import { calcRun } from '../../src/model/model';
import { join } from 'path';
import { readFileSync } from 'fs';
import { cloneDeep, mapValues } from 'lodash';
import { calcRun as referenceCalcRun } from './reference-model';

const FIXTURES = join(__filename, '..', 'fixtures');

const loadFixture = (...pathSegments: string[]): unknown => {
    return JSON.parse(readFileSync(join(FIXTURES, ...pathSegments), 'utf-8'));
};

describe('golden master acceptance tests', () => {
    test('dummy golden master', () => {
        const input = loadFixture('dummy.json') as any;
        const expectedOutput = mapValues(input, (scenario) => {
            const data = cloneDeep(scenario);
            referenceCalcRun(data);
            return data;
        });
        const computedOutput = mapValues(input, (scenario) => {
            const data = cloneDeep(scenario);
            calcRun(data);
            return data;
        });
        expect(computedOutput).toEqual(expectedOutput);
    });
});
