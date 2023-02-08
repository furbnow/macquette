import { Scenario } from '../../data-schemas/scenario';
import {
    AppliancesCookingCarbonCoop,
    AppliancesCookingCarbonCoopDependencies,
    AppliancesCookingCarbonCoopInput,
    extractAppliancesCarbonCoopInputFromLegacy,
} from './lighting-appliances-cooking/appliances-cooking-carbon-coop';
import {
    AppliancesSAP,
    AppliancesSAPDependencies,
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
          input: AppliancesCookingCarbonCoopInput;
      };

export function extractAppliancesInputFromLegacy(scenario: Scenario): AppliancesInput {
    switch (scenario?.LAC_calculation_type) {
        case 'SAP':
        case undefined:
            return {
                type: 'sap',
                input: extractAppliancesSAPInputFromLegacy(scenario),
            };
        case 'carboncoop_SAPlighting':
            return {
                type: 'carbon coop',
                input: extractAppliancesCarbonCoopInputFromLegacy(scenario),
            };
    }
}

export type AppliancesDependencies = AppliancesSAPDependencies &
    AppliancesCookingCarbonCoopDependencies;

export type Appliances = AppliancesSAP | AppliancesCookingCarbonCoop;
export function constructAppliances(
    input: AppliancesInput,
    dependencies: AppliancesDependencies,
): Appliances {
    switch (input.type) {
        case 'sap':
            return new AppliancesSAP(input.input, dependencies);
        case 'carbon coop':
            return new AppliancesCookingCarbonCoop(input.input, dependencies);
    }
}
