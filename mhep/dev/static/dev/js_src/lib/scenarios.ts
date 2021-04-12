import { NewAssessment, Scenario } from '../types/Assessment';

export function getScenario(assessment: NewAssessment, scenarioId: string): Scenario {
    if (scenarioId in assessment) {
        return assessment[scenarioId];
    }

    throw new Error(`Scenario doesn't exist: ${scenarioId}`);
}
