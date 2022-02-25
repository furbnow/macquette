import { LegacyScenario } from '../../legacy-state-validators/scenario';
import {
    CookingSAP,
    CookingSAPDependencies,
    CookingSAPInput,
    extractCookingSAPInputFromLegacy,
} from './lighting-appliances-cooking/cooking-sap';

export type CookingInput =
    | { type: 'sap'; input: CookingSAPInput }
    | { type: 'carbon coop' };

export const extractCookingInputFromLegacy = (scenario: LegacyScenario): CookingInput => {
    switch (scenario.LAC_calculation_type) {
        case 'SAP':
        case undefined:
            return {
                type: 'sap',
                input: extractCookingSAPInputFromLegacy(scenario),
            };
        case 'carboncoop_SAPlighting':
            return {
                type: 'carbon coop',
            };
    }
};

export type CookingDependencies = CookingSAPDependencies & unknown;

export const constructCooking = (
    input: CookingInput,
    dependencies: CookingDependencies,
): CookingSAP | CookingNoop => {
    switch (input.type) {
        case 'sap':
            return new CookingSAP(input.input, dependencies);
        case 'carbon coop':
            return new CookingNoop();
    }
};

class CookingNoop {
    mutateLegacyData() {
        // pass
    }
}