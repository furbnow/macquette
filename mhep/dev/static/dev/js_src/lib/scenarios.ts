import { NewAssessment, Scenario } from '../types/Assessment';

export function getScenario(assessment: NewAssessment, scenarioId: string): Scenario {
    if (scenarioId in assessment) {
        return assessment[scenarioId] as Scenario;
    }

    throw new Error(`Scenario doesn't exist: ${scenarioId}`);
}

interface ScenarioList {
    id: string;
    title: string;
    isBaseline: boolean;
    num: number;
}

// Get a list of scenarios: ids, titles, number (as in 'scenario 1') and whether
// they are the baseline.
//
// Not all of this data is stored in the same places or in a sane way so this
// provides a nicer form of access.  Note it doesn't return the scenario data itself;
// this would be done through assessment.getScenario(id) or similar.  (Which doesn't
// yet exist.)
//
// 'excludeBase' is an attempt to avoid the word 'master' being used all over the
// codebase, as its use is now archaic - we prefer the term 'baseline' but 'master'
// is currently hardcoded all over the code.
export function getScenarioList(
    assessment: NewAssessment,
    excludeBase = false
): ScenarioList[] {
    let scenarioIds = Object.keys(assessment).filter((key) => !key.startsWith('_'));

    if (excludeBase) {
        scenarioIds = scenarioIds.filter((id) => id !== 'master');
    }

    return scenarioIds
        .map((id) => ({
            id,
            title: (assessment[id] as Scenario).scenario_name,
            isBaseline: id === 'master',
            num: id === 'master' ? 0 : parseInt(id.replaceAll(/scenario/g, ''), 10),
        }))
        .sort((a, b) => a.num - b.num);
}

function getNextEmptyId(existing: number[]): number {
    let idx = 0;
    const start = existing[0];
    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (existing[idx] === start + idx) {
            idx++;
        } else {
            return start + idx;
        }
    }
}

export function deepCopy<T>(thing: T): T {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return JSON.parse(JSON.stringify(thing));
}

export function duplicateScenario(
    assessment: NewAssessment,
    id: string,
    title: string
): void {
    const nums = getScenarioList(assessment, true).map(({ num }) => num);
    const newNum = getNextEmptyId(nums);
    const newId = `scenario${newNum}`;

    const oldScenario = getScenario(assessment, id);

    const newScenario = deepCopy(oldScenario);
    newScenario.scenario_name = title;
    newScenario.locked = false;
    newScenario.creation_hash = generate_hash(JSON.stringify(newScenario));
    newScenario.measures = {};
    newScenario.fabric.measures = {};
    newScenario.created_from = id;
    for (const elem of newScenario.fabric.elements) {
        if (!('cost_total' in elem)) {
            delete elem.cost_total;
        }
    }

    assessment[newId] = newScenario;
}

export function scenarioHasChanged(
    baseScenario: Scenario,
    cmpScenario: Scenario
): boolean {
    const creation_hash = cmpScenario.creation_hash;
    if (!creation_hash) {
        return false;
    }

    const originalScenario = deepCopy(baseScenario);
    originalScenario.locked = false;
    const current_hash = generate_hash(JSON.stringify(originalScenario));

    return creation_hash != current_hash;
}

function generate_hash(str: string): number {
    if (str.length === 0) {
        return 0;
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
