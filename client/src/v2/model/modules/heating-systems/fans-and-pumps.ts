import type { LegacyHeatingSystem } from '.';
import { coalesceEmptyString } from '../../../data-schemas/scenario/value-schemas';

export type FansAndPumpsHeatingSystemInput =
    | {
          type: 'warm air system';
          specificFanPower: number | null; // W/(l/s) aka J/l
      }
    | {
          type: 'central heating system with pump inside';
          pumpPowerKWhPerYear: number;
      };

export function extractFansAndPumpsHeatingSystemInput(
    legacySystem: LegacyHeatingSystem,
): FansAndPumpsHeatingSystemInput | null {
    if (legacySystem.category === 'Warm air systems') {
        let specificFanPower: number | null;
        switch (legacySystem.sfp) {
            case 'undefined':
            case '':
            case undefined:
                specificFanPower = null;
                break;
            default:
                specificFanPower = legacySystem.sfp;
                break;
        }
        return {
            type: 'warm air system',
            specificFanPower,
        };
    } else if (legacySystem.central_heating_pump_inside ?? false) {
        return {
            type: 'central heating system with pump inside',
            pumpPowerKWhPerYear:
                coalesceEmptyString(legacySystem.central_heating_pump, 0) ?? 0,
        };
    } else {
        return null;
    }
}

export type FansAndPumpsHeatingSystemDependencies = {
    floors: { totalVolume: number };
};

export class FansAndPumpsHeatingSystem {
    constructor(
        private input: FansAndPumpsHeatingSystemInput,
        private dependencies: FansAndPumpsHeatingSystemDependencies,
    ) {}

    get heatGain(): number {
        switch (this.input.type) {
            case 'warm air system':
                return (
                    (this.input.specificFanPower ?? 1.5) *
                    0.04 *
                    this.dependencies.floors.totalVolume
                );
            case 'central heating system with pump inside':
                return (this.input.pumpPowerKWhPerYear * 1000) / (24 * 365); // to Watts
        }
    }
}
