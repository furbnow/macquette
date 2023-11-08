import fc from 'fast-check';
import { merge } from 'lodash';
import { scenarioSchema } from '../../src/data-schemas/scenario';
import { Month } from '../../src/model/enums/month';
import {
  FansAndPumpsHeatingSystem,
  extractFansAndPumpsHeatingSystemInput,
  fansAndPumpsHeatingSystemInput,
} from '../../src/model/modules/heating-systems/fans-and-pumps';
import { FansAndPumpsGains } from '../../src/model/modules/internal-gains/fans-and-pumps';
import { VentilationInfiltrationCommon } from '../../src/model/modules/ventilation-infiltration/common-input';
import { Ventilation } from '../../src/model/modules/ventilation-infiltration/ventilation';
import { makeArbitrary } from '../helpers/make-arbitrary';
import { legacyMetabolicLossesFansAndPumpsGains } from './golden-master/metabolic-losses-fans-and-pumps-gains';
import {
  arbCommonInput as arbVentilationInfiltrationCommonInput,
  arbDependencies as arbVentilationInfiltrationTestDependencies,
  arbVentilationInput,
  makeLegacyDataForVentilation,
} from './ventilation-infiltration-arbitraries';

const arbFansAndPumpsHeatingSystemInput = makeArbitrary(fansAndPumpsHeatingSystemInput);

const arb = fc.record({
  fansAndPumpsHeatingSystemInputs: fc.array(arbFansAndPumpsHeatingSystemInput),
  ventilationInfiltrationCommonInput: arbVentilationInfiltrationCommonInput,
  ventilationInput: arbVentilationInput,
  ventilationInfiltrationTestDependencies: arbVentilationInfiltrationTestDependencies,
});
type FcInfer<T> = T extends fc.Arbitrary<infer I> ? I : never;
function makeLegacyDataForFansAndPumpsGains({
  fansAndPumpsHeatingSystemInputs,
  ventilationInfiltrationCommonInput,
  ventilationInput,
  ventilationInfiltrationTestDependencies,
}: FcInfer<typeof arb>) {
  const out: unknown = {};
  merge(
    out,
    makeLegacyDataForVentilation(
      ventilationInfiltrationCommonInput,
      ventilationInput,
      ventilationInfiltrationTestDependencies,
      { mechanicalExtractVentilationIsDecentralised: false },
    ),
  );
  merge(out, {
    gains_W: {},
    heating_systems: fansAndPumpsHeatingSystemInputs.map((input) => {
      let category: string;
      switch (input.type) {
        case 'warm air system':
          category = 'Warm air systems';
          break;
        case 'central heating system with pump inside':
          // Placeholder value, could be "System boilers", "Heat pumps", etc.,
          // but it doesn't actually matter to anything
          category = 'Combi boilers';
          break;
      }
      return {
        category,
        sfp: input.type === 'warm air system' ? input.specificFanPower ?? '' : undefined,
        central_heating_pump_inside:
          input.type === 'central heating system with pump inside',
        central_heating_pump:
          input.type === 'central heating system with pump inside'
            ? input.pumpPowerKWhPerYear
            : undefined,
        fuel: '',
      };
    }),
    volume: ventilationInfiltrationTestDependencies.floors.totalVolume,
  });
  return out;
}

describe('fans and pumps gains', () => {
  test('golden master', () => {
    fc.assert(
      fc.property(
        arb,
        ({
          fansAndPumpsHeatingSystemInputs,
          ventilationInfiltrationCommonInput,
          ventilationInput,
          ventilationInfiltrationTestDependencies,
        }) => {
          const common = new VentilationInfiltrationCommon(
            ventilationInfiltrationCommonInput,
            ventilationInfiltrationTestDependencies,
          );
          const ventilation = new Ventilation(ventilationInput, {
            ...ventilationInfiltrationTestDependencies,
            ventilationInfiltrationCommon: common,
          });
          const fansAndPumpsHeatingSystems = fansAndPumpsHeatingSystemInputs.map(
            (input) =>
              new FansAndPumpsHeatingSystem(input, {
                floors: ventilationInfiltrationTestDependencies.floors,
                modelBehaviourFlags: {
                  heatingSystems: {
                    fansAndPumps: {
                      fixUndefinedSpecificFanPowerInWarmAirSystems: false,
                      warmAirSystemsZeroGainInSummer: false,
                    },
                  },
                },
              }),
          );
          const fansAndPumpsGains = new FansAndPumpsGains(null, {
            heatingSystems: { fansAndPumpsHeatingSystems },
            ventilation,
          });
          const legacyData: any = makeLegacyDataForFansAndPumpsGains({
            fansAndPumpsHeatingSystemInputs,
            ventilationInfiltrationCommonInput,
            ventilationInput,
            ventilationInfiltrationTestDependencies,
          });
          // Fix bug that was not given a modelBehaviourFlags flag
          legacyData.heating_systems.forEach((legacyHeatingSystem: any) => {
            if (legacyHeatingSystem.category === 'Warm air systems') {
              legacyHeatingSystem.category = 'Warm air system';
            }
          });
          legacyMetabolicLossesFansAndPumpsGains(legacyData);
          for (const month of Month.all) {
            expect(fansAndPumpsGains.heatGain(month)).toBeApproximately(
              legacyData.gains_W.fans_and_pumps[month.index0],
            );
          }
        },
      ),
    );
  });

  test('extractor', () => {
    fc.assert(
      fc.property(arb, (testInputs) => {
        const scenario = scenarioSchema.parse(
          makeLegacyDataForFansAndPumpsGains(testInputs),
        );
        const roundTripped = (scenario?.heating_systems ?? []).map((system) =>
          extractFansAndPumpsHeatingSystemInput(system),
        );
        expect(roundTripped).toEqual(testInputs.fansAndPumpsHeatingSystemInputs);
      }),
    );
  });
});
