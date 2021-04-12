import { NewAssessment, Scenario } from '../types/Assessment';

export function getScenario(assessment: NewAssessment, scenarioId: string): Scenario {
    if (scenarioId in assessment) {
        return assessment[scenarioId];
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

    return scenarioIds.map((id) => ({
        id,
        title: assessment[id].scenario_name,
        isBaseline: id === 'master',
        num: id === 'master' ? 0 : parseInt(id.replaceAll(/scenario/g, ''), 10),
    }));
}
