import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { z } from 'zod';

const fixturesRoot = join(__filename, '..');

const collectFromDirectory = (dir: string) => {
    return readdirSync(dir)
        .filter((filename) => filename.endsWith('.json') && !filename.startsWith('.'))
        .map((filename) => join(dir, filename));
};

const fixturePaths = [
    ...collectFromDirectory(fixturesRoot),
    ...collectFromDirectory(join(fixturesRoot, 'private')),
];

const safeJsonParse = (...args: Parameters<typeof JSON.parse>): unknown =>
    JSON.parse(...args);

export type Scenario = { name: string; data: unknown };
export const fixtures: Array<Scenario> = fixturePaths.map((path) => ({
    name: relative(fixturesRoot, path),
    data: safeJsonParse(readFileSync(path, 'utf-8')),
}));

const fixtureSchema = z.object({
    data: z.record(z.unknown()),
});

export const scenarios = fixtures.flatMap((fixture) => {
    const parseResult = fixtureSchema.safeParse(fixture.data);
    if (parseResult.success) {
        return Object.entries(parseResult.data.data).map(
            ([scenarioName, scenarioData]) => ({
                name: `${fixture.name} - ${scenarioName}`,
                data: scenarioData,
            }),
        );
    } else {
        console.warn(`Scenario parse failure for fixture ${fixture.name}`);
        return [];
    }
});

export const shouldSkipScenario = (scenario: Scenario): boolean => {
    // eslint-disable-next-line
    if ((scenario.data as any).LAC_calculation_type === 'detailedlist') {
        console.warn(
            `Skipping fixed data test "${scenario.name}" for detailedlist LAC mode`,
        );
        return true;
    }
    return false;
};
