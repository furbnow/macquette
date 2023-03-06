import { Scenario } from '../../../data-schemas/scenario';
import {
    extractWaterHeatingSystemInput,
    WaterHeatingSystem,
    WaterHeatingSystemDependencies,
    WaterHeatingSystemInput,
} from './water';

export type HeatingSystemInput = { waterHeating: null | WaterHeatingSystemInput };

export function extractHeatingSystemsInputFromLegacy(
    scenario: Scenario,
): HeatingSystemInput[] {
    return (scenario?.heating_systems ?? []).flatMap(
        (legacySystem): [HeatingSystemInput] | [] => {
            const out = extractSingleHeatingSystemInput(legacySystem, scenario);
            if (out === null) {
                return [];
            } else {
                return [out];
            }
        },
    );
}

export type LegacyHeatingSystem = Exclude<
    Exclude<Scenario, undefined>['heating_systems'],
    undefined
>[0];

function extractSingleHeatingSystemInput(
    legacySystem: LegacyHeatingSystem,
    scenario: Scenario,
): HeatingSystemInput {
    return {
        waterHeating: extractWaterHeatingSystemInput(legacySystem, scenario),
    };
}

export type HeatingSystemDependencies = WaterHeatingSystemDependencies;

export class HeatingSystems {
    constructor(
        private input: HeatingSystemInput[],
        private dependencies: HeatingSystemDependencies,
    ) {}

    get waterHeatingSystems(): WaterHeatingSystem[] {
        return this.input.flatMap((inputSystem) => {
            if (inputSystem.waterHeating !== null) {
                return [
                    new WaterHeatingSystem(inputSystem.waterHeating, this.dependencies),
                ];
            } else {
                return [];
            }
        });
    }
}
