import { writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { cloneDeep } from 'lodash';
import { z } from 'zod';

import { calcRun } from '../src/v2/model/model';

const MODEL_VERSION_LEGACY = 'legacy';
const MODEL_VERSION_LATEST = 1;

const HEADLINE_FIGURE_KEY = 'space_heating_demand_m2';

function runModel(scenarioData: unknown) {
    const input = cloneDeep(scenarioData);
    const oldConsoleWarn = console.warn;
    console.warn = () => undefined;
    try {
        /* eslint-disable
            @typescript-eslint/no-unsafe-call,
            @typescript-eslint/consistent-type-assertions,
            @typescript-eslint/no-unsafe-member-access,
            @typescript-eslint/no-explicit-any
        */
        calcRun(input);
        calcRun(input);
        return (input as any)[HEADLINE_FIGURE_KEY] as number;
        /* eslint-enable */
    } finally {
        console.warn = oldConsoleWarn;
    }
}

const basicAssessmentSchema = z.object({
    data: z.record(z.string(), z.unknown()),
});

async function main() {
    const filenames = process.argv.slice(2);
    console.info('Reading and validating files');
    const assessments = await Promise.all(
        filenames.map(async (filename) => {
            try {
                const data = await readFile(filename, 'utf-8');
                const parsed: unknown = JSON.parse(data);
                const { data: scenarios } = basicAssessmentSchema.parse(parsed);
                writeFileSync(2, '.');
                return { filename, scenarios };
            } catch (err) {
                console.error(filename);
                throw err;
            }
        }),
    );
    writeFileSync(2, '\n');
    const scenarios = assessments.flatMap(({ scenarios, ...rest }) => {
        return Object.entries(scenarios).map(([scenarioName, scenarioData]) => ({
            scenarioName,
            scenarioData,
            ...rest,
        }));
    });
    console.info('Running models');
    const modelResults = scenarios.map(({ scenarioData, ...rest }) => {
        const legacyModelInput: unknown = Object.assign({}, scenarioData, {
            modelBehaviourVersion: MODEL_VERSION_LEGACY,
        });
        const legacyOut = runModel(legacyModelInput);
        const latestModelInput: unknown = Object.assign({}, scenarioData, {
            modelBehaviourVersion: MODEL_VERSION_LATEST,
        });
        const latestOut = runModel(latestModelInput);
        writeFileSync(2, '.');
        return { ...rest, legacyOut, latestOut };
    });
    writeFileSync(2, '\n');
    console.info('Writing output JSON');
    writeFileSync('compare-models-output.json', JSON.stringify(modelResults), 'utf-8');
}

main().catch(console.error);
