/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-non-null-assertion,
    @typescript-eslint/no-unsafe-assignment,
    @typescript-eslint/no-unsafe-call,
    @typescript-eslint/no-unsafe-return,
    @typescript-eslint/no-unsafe-member-access */

// ./node_modules/.bin/ts-node run-model <stdin >stdout

import { readFileSync } from 'fs';
import { calcRun } from '../src/v2/model/model';
import { cloneDeep, mapValues } from 'lodash';

const modelInputs: any = JSON.parse(readFileSync(0, 'utf-8')); // STDIN_FILENO = 0

const computedOutputs = mapValues(modelInputs, (scenario) => {
    const data = cloneDeep(scenario);
    calcRun(data);
    return data;
});

console.log(JSON.stringify(computedOutputs, null, 4));
