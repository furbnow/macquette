import { Scenario } from '../../data-schemas/scenario';
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

export const extractAppliancesInputFromLegacy = (scenario: Scenario): AppliancesInput => {
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

export type Appliances = AppliancesSAP | AppliancesNoop;
export const constructAppliances = (
    input: AppliancesInput,
    dependencies: AppliancesDependencies,
): Appliances => {
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
