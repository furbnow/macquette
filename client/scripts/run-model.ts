/* eslint-disable @typescript-eslint/no-explicit-any,
  @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-member-access
*/
import { mapLimit } from 'async';
import { readFile, writeFile } from 'fs/promises';
import { cloneDeep, concat } from 'lodash';
import { z } from 'zod';
import { calcRun } from '../src/model/model';

const OUT_FILE = 'model-results.json';
const MAX_ASYNC_OPERATIONS = 20;
const VERSIONS = ['as specified', 'legacy', 3, 4] as const;

async function main() {
  const inputFiles = process.argv.slice(2);

  const assessmentSchema = z.object({ data: z.record(z.unknown()) });
  const resultsNested = await mapLimit(
    inputFiles,
    MAX_ASYNC_OPERATIONS,
    async (fileName: string) => {
      const fileContent = await readFile(fileName, 'utf-8');
      const jsonParsed: unknown = JSON.parse(fileContent);
      let scenarios: { fileName: string; scenarioName: string | null; data: any }[];
      const assessmentParseResult = assessmentSchema.safeParse(jsonParsed);
      if (assessmentParseResult.success) {
        // We have a full assessment
        scenarios = Object.entries(assessmentParseResult.data.data).map(
          ([scenarioName, data]) => ({
            fileName,
            scenarioName,
            data,
          }),
        );
      } else {
        // We have a single scenario
        scenarios = [{ fileName: fileName, scenarioName: null, data: jsonParsed }];
      }
      const out = scenarios.flatMap(({ fileName, scenarioName, data }) =>
        VERSIONS.map((version) => {
          const scenarioToMutate = cloneDeep(data);
          if (version !== 'as specified') {
            scenarioToMutate.modelBehaviourVersion = version;
          }
          const oldConsoleWarn = console.warn;
          try {
            console.warn = () => undefined;
            calcRun(scenarioToMutate);
            calcRun(scenarioToMutate);
          } finally {
            console.warn = oldConsoleWarn;
          }
          const spaceHeatingDemandPerArea: number =
            scenarioToMutate.space_heating_demand_m2;
          process.stdout.write('.');
          return { scenarioName, fileName, version, spaceHeatingDemandPerArea };
        }),
      );
      return out;
    },
  );
  const results = concat(...resultsNested);
  await writeFile(OUT_FILE, JSON.stringify(results), 'utf-8');
}

main().catch(console.error);
