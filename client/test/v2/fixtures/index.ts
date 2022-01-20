import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';

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

export const fixtures: Array<{ name: string; data: unknown }> = fixturePaths.map(
    (path) => ({
        name: relative(fixturesRoot, path),
        data: safeJsonParse(readFileSync(path, 'utf-8')),
    }),
);

export const scenarios = fixtures.flatMap(
    (fixture) =>
        /* eslint-disable */
        Object.entries((fixture.data as any).data).map(
            ([scenarioName, scenarioData]) => ({
                name: `${fixture.name} ; ${scenarioName}`,
                data: scenarioData,
            }),
        ),
    /* eslint-enable */
);
