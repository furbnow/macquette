import { getScenarioList } from './scenarios';

import { NewAssessment, ScenarioString } from '../types/Assessment';

// List scenario commentaries that for scenarios that don't exist in the assessment
//
// This can happen when an assessor creates a scenario, writes a commentary and then
// deletes the scenario.  Quite a lot of work goes into commentaries so it's good to
// preserve them; because they are all entered on a single page it's not necessarily
// expected they are tightly bound to the actual scenarios.
export function getOrphanedScenarioIds(assessment: NewAssessment): string[] {
    const allScenarioIds = getScenarioList(assessment, true).map(({ id }) => id);
    const commentaryScenarioIds = Object.keys(
        assessment._commentary.scenarios
    ) as ScenarioString[];

    return commentaryScenarioIds.filter((id) => !allScenarioIds.includes(id));
}
