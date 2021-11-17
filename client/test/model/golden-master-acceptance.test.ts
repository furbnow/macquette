import { calcRun } from '../../src/model/model';
import { join } from 'path';
import { readFileSync, readdirSync } from 'fs';
import { cloneDeep, mapValues } from 'lodash';
import { calcRun as referenceCalcRun } from './reference-model';

const FIXTURES = join(__filename, '..', 'fixtures');

const loadFixture = (...pathSegments: string[]): unknown => {
    return JSON.parse(readFileSync(join(FIXTURES, ...pathSegments), 'utf-8'));
};

describe('golden master acceptance tests', () => {
    const publicFixtures = readdirSync(FIXTURES).filter((filename) =>
        filename.endsWith('.json'),
    );
    for (const fixtureName of publicFixtures) {
        test(`${fixtureName}`, () => {
            const input = loadFixture(fixtureName) as any;
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
            expect(computedOutput).toEqualApproximately(expectedOutput);
        });
    }

    const privateFixtures = readdirSync(join(FIXTURES, 'private')).filter(
        (filename) => !filename.startsWith('.'),
    );
    for (const fixtureName of privateFixtures) {
        test(`private/${fixtureName}`, () => {
            const input = loadFixture(join('private', fixtureName)) as any;
            const expectedOutput = mapValues(input.data, (scenario) => {
                const data = cloneDeep(scenario);
                referenceCalcRun(data);
                return data;
            });
            const computedOutput = mapValues(input.data, (scenario) => {
                const data = cloneDeep(scenario);
                calcRun(data);
                return data;
            });
            expect(computedOutput).toEqualApproximately(expectedOutput);
        });
    }
});
