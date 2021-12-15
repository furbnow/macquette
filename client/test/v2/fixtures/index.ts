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

export class Scenario {
    public name: string;
    constructor(public path: string, public scenario: string, public data: unknown) {
        this.name = `${this.path} - ${this.scenario}`;
    }
}

export type Fixture = { path: string; data: unknown };
export const fixtures: Array<Fixture> = fixturePaths.map((path) => ({
    path: relative(fixturesRoot, path),
    data: safeJsonParse(readFileSync(path, 'utf-8')),
}));

const fixtureSchema = z.object({
    data: z.record(z.unknown()),
});

export const scenarios = fixtures.flatMap((fixture) => {
    const parseResult = fixtureSchema.safeParse(fixture.data);
    if (parseResult.success) {
        return Object.entries(parseResult.data.data).map(
            ([name, data]) => new Scenario(fixture.path, name, data),
        );
    } else {
        console.warn(`Scenario parse failure for fixture ${fixture.path}`);
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
