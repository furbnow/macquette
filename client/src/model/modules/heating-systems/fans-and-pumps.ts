import type { LegacyHeatingSystem } from '.';
import { coalesceEmptyString } from '../../../data-schemas/scenario/value-schemas';
import { TypeOf, t } from '../../../data-schemas/visitable-types';
import { Month } from '../../enums/month';
import { ModelBehaviourFlags } from '../behaviour-version';

export const fansAndPumpsHeatingSystemInput = t.discriminatedUnion('type', [
  t.struct({
    type: t.literal('warm air system'),
    specificFanPower: t.nullable(t.number()), // W/(l/s) aka J/l
  }),
  t.struct({
    type: t.literal('central heating system with pump inside'),
    pumpPowerKWhPerYear: t.number(),
  }),
]);

export type FansAndPumpsHeatingSystemInput = TypeOf<
  typeof fansAndPumpsHeatingSystemInput
>;

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
      pumpPowerKWhPerYear: coalesceEmptyString(legacySystem.central_heating_pump, 0) ?? 0,
    };
  } else {
    return null;
  }
}

export type FansAndPumpsHeatingSystemDependencies = {
  floors: { totalVolume: number };
  modelBehaviourFlags: {
    heatingSystems: Pick<ModelBehaviourFlags['heatingSystems'], 'fansAndPumps'>;
  };
};

export class FansAndPumpsHeatingSystem {
  private flags: ModelBehaviourFlags['heatingSystems']['fansAndPumps'];
  constructor(
    private input: FansAndPumpsHeatingSystemInput,
    private dependencies: FansAndPumpsHeatingSystemDependencies,
  ) {
    this.flags = dependencies.modelBehaviourFlags.heatingSystems.fansAndPumps;
  }

  heatGain(month: Month): number {
    switch (this.input.type) {
      case 'warm air system': {
        if (this.flags.warmAirSystemsZeroGainInSummer && month.season === 'summer') {
          return 0;
        }
        let specificFanPower: number;
        if (this.input.specificFanPower === null) {
          if (this.flags.fixUndefinedSpecificFanPowerInWarmAirSystems) {
            specificFanPower = 1.5;
          } else {
            specificFanPower = 0;
          }
        } else {
          specificFanPower = this.input.specificFanPower;
        }
        return specificFanPower * 0.04 * this.dependencies.floors.totalVolume;
      }
      case 'central heating system with pump inside':
        return (this.input.pumpPowerKWhPerYear * 1000) / (24 * 365); // to Watts
    }
  }
}
