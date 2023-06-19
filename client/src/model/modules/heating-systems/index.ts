import { Scenario } from '../../../data-schemas/scenario';
import {
    extractFansAndPumpsHeatingSystemInput,
    FansAndPumpsHeatingSystem,
    FansAndPumpsHeatingSystemDependencies,
    FansAndPumpsHeatingSystemInput,
} from './fans-and-pumps';
import {
    extractWaterHeatingSystemInput,
    WaterHeatingSystem,
    WaterHeatingSystemDependencies,
    WaterHeatingSystemInput,
} from './water';

export type HeatingSystemInput = {
    waterHeating: null | WaterHeatingSystemInput;
    fansAndPumps: null | FansAndPumpsHeatingSystemInput;
};

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
        fansAndPumps: extractFansAndPumpsHeatingSystemInput(legacySystem),
    };
}

export type HeatingSystemDependencies = WaterHeatingSystemDependencies &
    FansAndPumpsHeatingSystemDependencies;

export class HeatingSystems {
    constructor(
        private input: HeatingSystemInput[],
        private dependencies: HeatingSystemDependencies,
    ) {}

    /** A view of the heating systems which heat domestic hot water */
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

    /** A view of the heating systems which have fans and/or pumps */
    get fansAndPumpsHeatingSystems(): FansAndPumpsHeatingSystem[] {
        return this.input.flatMap((inputSystem) => {
            if (inputSystem.fansAndPumps !== null) {
                return [
                    new FansAndPumpsHeatingSystem(
                        inputSystem.fansAndPumps,
                        this.dependencies,
                    ),
                ];
            } else {
                return [];
            }
        });
    }
}
