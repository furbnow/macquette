import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { z } from 'zod';

import { Project, projectSchema } from '../../src/data-schemas/project';
import { Scenario, scenarioSchema } from '../../src/data-schemas/scenario';

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
  public rawData: z.input<typeof projectSchema>;

  constructor(
    public fixturePath: string,
    rawData: unknown,
  ) {
    const parseResult = projectSchema.safeParse(rawData);
    if (parseResult.success) {
      this.parsedData = parseResult.data;
      // SAFETY: the data passed the schema, so is assignable to the input type
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      this.rawData = rawData as z.input<typeof projectSchema>;
    } else {
      throw new Error(parseResult.error.toString());
    }
  }
}

export class ScenarioFixture {
  public displayName: string;
  constructor(
    public fixturePath: string,
    public scenarioName: string,
    public rawData: z.input<typeof scenarioSchema>,
    public data: Scenario,
  ) {
    this.displayName = `${this.fixturePath} - ${this.scenarioName}`;
  }
}

export type Fixture = { path: string; data: unknown };
export const fixtures: Array<Fixture> = fixturePaths.map((path) => ({
  path: relative(fixturesRoot, path),
  data: safeJsonParse(readFileSync(path, 'utf-8')),
}));

const projectFocus: null | string = null;

export const projects = fixtures.flatMap((fixture) => {
  if (projectFocus !== null && fixture.path !== projectFocus) {
    return [];
  }
  try {
    return [new ProjectFixture(fixture.path, fixture.data)];
  } catch (e) {
    console.error(`Project parse failure for fixture ${fixture.path}`, e);
    return [];
  }
});

export const scenarios = [
  new ScenarioFixture('[no path]', 'undefined scenario', undefined, undefined),
  ...projects.flatMap((project) => {
    return Object.entries(project.parsedData.data).map(
      ([name, scenarioData]) =>
        new ScenarioFixture(
          project.fixturePath,
          name,
          project.rawData.data[name],
          scenarioData,
        ),
    );
  }),
];
