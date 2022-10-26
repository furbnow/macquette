import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { z } from 'zod';

import type { Project } from '../../../src/v2/data-schemas/project';
import { projectSchema } from '../../../src/v2/data-schemas/project';
import { isIndexable } from '../../../src/v2/helpers/is-indexable';
import { isNotNull } from '../../../src/v2/helpers/null-checking';

const fixturesRoot = join(__filename, '..');

function collectFromDirectory(dir: string) {
    return readdirSync(dir)
        .filter((filename) => filename.endsWith('.json') && !filename.startsWith('.'))
        .map((filename) => join(dir, filename));
}

const fixturePaths = [
    ...collectFromDirectory(fixturesRoot),
    ...collectFromDirectory(join(fixturesRoot, 'private')),
];

function safeJsonParse(...args: Parameters<typeof JSON.parse>): unknown {
    return JSON.parse(...args);
}

export class ProjectFixture {
    public parsedData: Project;

    constructor(public fixturePath: string, public rawData: Record<string, unknown>) {
        const parseResult = projectSchema.safeParse(rawData);
        if (parseResult.success) {
            this.parsedData = parseResult.data;
        } else {
            throw new Error(parseResult.error.toString());
        }
    }
}

export class Scenario {
    public displayName: string;
    constructor(
        public fixturePath: string,
        public scenarioName: string,
        public data: unknown,
    ) {
        this.displayName = `${this.fixturePath} - ${this.scenarioName}`;
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

const projectFocus: null | string = null;

export const projects = fixtures
    .map((fixture) => {
        if (projectFocus !== null && fixture.path !== projectFocus) {
            return null;
        }

        if (!isIndexable(fixture.data)) {
            console.error(`Project is not a Record for fixture ${fixture.path}`);
            return null;
        }

        try {
            return new ProjectFixture(fixture.path, fixture.data);
        } catch (e) {
            console.error(`Project parse failure for fixture ${fixture.path}`, e);
            return null;
        }
    })
    .filter(isNotNull);

export const scenarios = [
    new Scenario('[no path]', 'undefined scenario', undefined),
    ...fixtures.flatMap((fixture) => {
        const parseResult = fixtureSchema.safeParse(fixture.data);
        if (parseResult.success) {
            return Object.entries(parseResult.data.data).map(
                ([name, data]) => new Scenario(fixture.path, name, data),
            );
        } else {
            console.warn(`Scenario parse failure for fixture ${fixture.path}`);
            return [];
        }
    }),
];

const knownBuggy: Array<{ reason: string; scenarios: Array<[string, string]> }> = [
    {
        reason: 'reference model outputs .ventilation.average_WK as NaN, causing bugs later',
        scenarios: [['private/443.json', 'scenario1']],
    },
    {
        reason: 'ventilation string concatenation bug',
        scenarios: [
            ['private/143.json', 'master'],
            ['private/143.json', 'scenario1'],
        ],
    },
    {
        reason: 'SHW flag mismatches',
        scenarios: [
            ['private/2.json', 'master'],
            ['private/137.json', 'master'],
            ['private/137.json', 'scenario1'],
            ['private/137.json', 'scenario2'],
            ['private/137.json', 'scenario3'],
            ['private/164.json', 'scenario1'],
            ['private/226.json', 'master'],
            ['private/226.json', 'scenario1'],
            ['private/234.json', 'scenario2'],
            ['private/237.json', 'scenario1'],
            ['private/307.json', 'scenario1'],
            ['private/307.json', 'scenario5'],
            ['private/337.json', 'scenario4'],
            ['private/348.json', 'scenario2'],
            ['private/358.json', 'master'],
        ],
    },
    {
        reason: 'heating system uses a buggy value for .combi_loss',
        scenarios: [
            ['private/364.json', 'master'],
            ['private/364.json', 'scenario1'],
            ['private/364.json', 'scenario2'],
            ['private/364.json', 'scenario3'],
            ['private/383.json', 'master'],
            ['private/383.json', 'scenario1'],
            ['private/383.json', 'scenario2'],
            ['private/383.json', 'scenario3'],
        ],
    },
    {
        reason: 'heating system specifies a combi boiler with a primary circuit (which is not valid)',
        scenarios: [
            ['private/170.json', 'scenario3'],
            ['private/598.json', 'master'],
            ['private/598.json', 'scenario1'],
            ['private/598.json', 'scenario2'],
        ],
    },
    {
        reason: 'some fuel contains a stringy value for standingcharge, which causes string concatenation bugs',
        scenarios: [
            ['private/333.json', 'master'],
            ['private/333.json', 'scenario1'],
            ['private/333.json', 'scenario2'],
            ['private/333.json', 'scenario3'],
            ['private/393.json', 'master'],
            ['private/393.json', 'scenario1'],
        ],
    },
];
const knownBuggyFlat: Array<[string, string, string]> = knownBuggy.flatMap(
    ({ reason, scenarios }) =>
        scenarios.map(([p, n]): [string, string, string] => [p, n, reason]),
);
export function shouldSkipScenario(scenario: Scenario): boolean {
    for (const [path, name, reason] of knownBuggyFlat) {
        if (scenario.fixturePath === path && scenario.scenarioName === name) {
            console.warn(
                `Skipping known buggy scenario ${scenario.displayName} (${reason})`,
            );
            return true;
        }
    }

    return false;
}
