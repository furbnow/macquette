import { calcRun } from '../../src/model/model';
import { join } from 'path';
import { readFileSync } from 'fs';
import { cloneDeep, mapValues } from 'lodash';

const FIXTURES = join(__filename, '..', 'fixtures');

const loadFixture = (...pathSegments: string[]): unknown => {
    return JSON.parse(readFileSync(join(FIXTURES, ...pathSegments), 'utf-8'));
};

describe('golden master acceptance tests', () => {
    // eslint-disable-next-line jest/no-disabled-tests
    test.skip('dummy golden master', () => {
        const input = (loadFixture('dummy.in.json') as any).data;
        const expectedOutput = loadFixture('dummy.out.json');
        const computedOutput = mapValues(input, (scenario) => {
            const data = cloneDeep(scenario);
            calcRun(data);
            return data;
        });
        expect(computedOutput).toEqual(expectedOutput);
    });
});
