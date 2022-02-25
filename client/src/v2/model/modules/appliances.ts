import { LegacyScenario } from '../../legacy-state-validators/scenario';
import {
    AppliancesSAPDependencies,
    AppliancesSAP,
    AppliancesSAPInput,
    extractAppliancesSAPInputFromLegacy,
} from './lighting-appliances-cooking/appliances-sap';

export type AppliancesInput =
    | {
          type: 'sap';
          input: AppliancesSAPInput;
      }
    | {
          type: 'carbon coop';
      };

export const extractAppliancesInputFromLegacy = (
    scenario: LegacyScenario,
): AppliancesInput => {
    switch (scenario.LAC_calculation_type) {
        case 'SAP':
        case undefined:
            return {
                type: 'sap',
                input: extractAppliancesSAPInputFromLegacy(scenario),
            };
        case 'carboncoop_SAPlighting':
            return {
                type: 'carbon coop',
            };
    }
};

export type AppliancesDependencies = AppliancesSAPDependencies & unknown;

export const constructAppliances = (
    input: AppliancesInput,
    dependencies: AppliancesDependencies,
): AppliancesSAP | AppliancesNoop => {
    switch (input.type) {
        case 'sap':
            return new AppliancesSAP(input.input, dependencies);
        case 'carbon coop':
            return new AppliancesNoop();
    }
};

class AppliancesNoop {
    mutateLegacyData() {
        // pass
    }
}