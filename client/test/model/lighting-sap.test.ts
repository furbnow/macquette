import fc from 'fast-check';
import { cloneDeep } from 'lodash';
import { scenarioSchema } from '../../src/data-schemas/scenario';
import { zip } from '../../src/helpers/zip';
import { Month } from '../../src/model/enums/month';
import {
  LightingSAP,
  LightingSAPDependencies,
  LightingSAPInput,
  extractLightingSAPInputFromLegacy,
  lightingSAPInput,
} from '../../src/model/modules/lighting-appliances-cooking/lighting-sap';
import { sensibleFloat } from '../arbitraries/legacy-values';
import { makeArbitrary } from '../helpers/make-arbitrary';
import { legacyLightingAppliancesCooking } from './golden-master/lighting-appliances-cooking';

const arbLightingSAPInput = makeArbitrary(lightingSAPInput);
const arbLightingSAPDependencies: fc.Arbitrary<LightingSAPDependencies> = fc.record({
  fuels: fc.record({ names: fc.array(fc.string()) }),
  floors: fc.record({
    totalFloorArea: sensibleFloat.filter((value) => value >= 0),
  }),
  occupancy: fc.record({
    occupancy: sensibleFloat.filter((value) => value >= 0),
  }),
  fabric: fc.record({ naturalLight: sensibleFloat }),
});

function makeLegacyDataForLightingSAP(
  input: LightingSAPInput,
  dependencies: LightingSAPDependencies,
) {
  return {
    occupancy: dependencies.occupancy.occupancy,
    TFA: dependencies.floors.totalFloorArea,
    GL: dependencies.fabric.naturalLight,
    LAC_calculation_type: 'SAP',
    LAC: {
      L: input.outlets.total,
      LLE: input.outlets.lowEnergy,
      reduced_heat_gains_lighting: input.reducedHeatGains,
      fuels_lighting: input.fuels.map(({ name, fraction }) => ({
        fuel: name,
        fraction,
        demand: 0,
      })),
    },
    fuel_requirements: {
      cooking: { quantity: 0 },
      lighting: { quantity: 0 },
      appliances: { quantity: 0 },
    },
    gains_W: { Lighting: new Array(12).fill(0) },
    energy_requirements: {
      lighting: { quantity: 0, monthly: new Array(12).fill(0) },
    },
    fuels: {},
  };
}

describe('lighting SAP', () => {
  test('golden master', () => {
    fc.assert(
      fc.property(
        arbLightingSAPInput,
        arbLightingSAPDependencies,
        (input, dependencies_) => {
          const dependencies = cloneDeep(dependencies_);
          dependencies.fuels.names.push(...input.fuels.map((fuel) => fuel.name));
          const lightingSAP = new LightingSAP(input, dependencies);
          const legacyData: any = makeLegacyDataForLightingSAP(input, dependencies_);
          legacyLightingAppliancesCooking(legacyData);
          expect(legacyData.LAC.EB).toBeApproximately(lightingSAP.baselineEnergyAnnual);
          /* eslint-disable jest/no-conditional-expect */
          if (legacyData.LAC.C1 === undefined) {
            expect(lightingSAP.lowEnergyCorrectionFactor).toBeNull();
          } else {
            expect(lightingSAP.lowEnergyCorrectionFactor).not.toBeNull();
            expect(legacyData.LAC.C1).toBeApproximately(
              lightingSAP.lowEnergyCorrectionFactor!,
            );
          }
          if (legacyData.LAC.C2 !== undefined) {
            expect(legacyData.LAC.C2).toBeApproximately(
              lightingSAP.daylightingCorrectionFactor,
            );
          }
          if (legacyData.LAC.EL !== undefined) {
            expect(legacyData.LAC.EL).toBeApproximately(lightingSAP.initialEnergyAnnual);
          }
          /* eslint-enable */
          expect(legacyData.energy_requirements.lighting.quantity).toBeApproximately(
            lightingSAP.energyAnnual,
          );
          for (const month of Month.all) {
            expect(
              legacyData.energy_requirements.lighting.monthly[month.index0],
            ).toBeApproximately(lightingSAP.energyMonthly(month));
            expect(legacyData.gains_W.Lighting[month.index0]).toBeApproximately(
              lightingSAP.heatGainMonthly(month),
            );
          }
          expect(lightingSAP.fuelDemand).toHaveLength(
            legacyData.LAC.fuels_lighting.length,
          );
          for (const [legacyFuel, fuel] of zip(
            legacyData.LAC.fuels_lighting as any[],
            lightingSAP.fuelDemand,
          )) {
            expect(legacyFuel.demand).toBeApproximately(fuel.demand);
          }
          expect(legacyData.fuel_requirements.lighting.quantity).toBeApproximately(
            lightingSAP.totalFuelDemand,
          );
        },
      ),
    );
  });
  test('extractor', () => {
    fc.assert(
      fc.property(
        arbLightingSAPInput,
        arbLightingSAPDependencies,
        (input, dependencies) => {
          const roundTripped = extractLightingSAPInputFromLegacy(
            scenarioSchema.parse(makeLegacyDataForLightingSAP(input, dependencies)),
          );
          expect(roundTripped).toEqual(input);
        },
      ),
    );
  });
});
