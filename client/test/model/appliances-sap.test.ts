import fc from 'fast-check';
import { cloneDeep } from 'lodash';
import { scenarioSchema } from '../../src/data-schemas/scenario';
import { zip } from '../../src/helpers/zip';
import { Month } from '../../src/model/enums/month';
import {
  AppliancesSAP,
  AppliancesSAPDependencies,
  AppliancesSAPInput,
  extractAppliancesSAPInputFromLegacy,
} from '../../src/model/modules/lighting-appliances-cooking/appliances-sap';
import { cookingSAPInput } from '../../src/model/modules/lighting-appliances-cooking/cooking-sap';
import { sensibleFloat } from '../arbitraries/legacy-values';
import { makeArbitrary } from '../helpers/make-arbitrary';
import { legacyLightingAppliancesCooking } from './golden-master/lighting-appliances-cooking';

const arbAppliancesSAPInput = makeArbitrary(cookingSAPInput);
const arbAppliancesSAPDependencies: fc.Arbitrary<AppliancesSAPDependencies> = fc.record({
  fuels: fc.record({
    names: fc.array(fc.string()),
  }),
  floors: fc.record({
    totalFloorArea: sensibleFloat.filter((value) => value >= 0),
  }),
  occupancy: fc.record({
    occupancy: sensibleFloat.filter((value) => value >= 0),
  }),
});

function makeLegacyDataForAppliancesSAP(
  input: AppliancesSAPInput,
  dependencies: AppliancesSAPDependencies,
) {
  return {
    occupancy: dependencies.occupancy.occupancy,
    TFA: dependencies.floors.totalFloorArea,
    LAC_calculation_type: 'SAP',
    LAC: {
      energy_efficient_appliances: input.energyEfficient,
      fuels_appliances: input.fuels.map(({ name, fraction }) => ({
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
    gains_W: { Appliances: new Array(12).fill(0) },
    energy_requirements: {
      appliances: { monthly: new Array(12).fill(0) },
    },
    fuels: {},
  };
}

describe('appliances SAP', () => {
  test('golden master', () => {
    fc.assert(
      fc.property(
        arbAppliancesSAPInput,
        arbAppliancesSAPDependencies,
        (input, dependencies_) => {
          const dependencies = cloneDeep(dependencies_);
          dependencies.fuels.names.push(...input.fuels.map((fuel) => fuel.name));
          const appliancesSAP = new AppliancesSAP(input, dependencies);
          const legacyData: any = makeLegacyDataForAppliancesSAP(input, dependencies);
          legacyLightingAppliancesCooking(legacyData);
          expect(legacyData.LAC.EA).toBeApproximately(appliancesSAP.energyAnnual);
          for (const month of Month.all) {
            expect(legacyData.gains_W.Appliances[month.index0]).toBeApproximately(
              appliancesSAP.heatGainMonthly(month),
            );
            expect(
              legacyData.energy_requirements.appliances.monthly[month.index0],
            ).toBeApproximately(appliancesSAP.energyMonthly(month));
          }
          expect(legacyData.LAC.fuels_appliances).toHaveLength(
            appliancesSAP.fuelDemand.length,
          );
          for (const [legacyFuel, fuel] of zip(
            legacyData.LAC.fuels_appliances as any[],
            appliancesSAP.fuelDemand,
          )) {
            expect(legacyFuel.fuel).toBe(fuel.fuel.name);
            expect(legacyFuel.demand).toBeApproximately(fuel.demand);
          }
          expect(legacyData.fuel_requirements.appliances.quantity).toBeApproximately(
            appliancesSAP.totalFuelDemand,
          );
        },
      ),
    );
  });

  test('extractor', () => {
    fc.assert(
      fc.property(
        arbAppliancesSAPInput,
        arbAppliancesSAPDependencies,
        (input, dependencies) => {
          const roundTripped = extractAppliancesSAPInputFromLegacy(
            scenarioSchema.parse(makeLegacyDataForAppliancesSAP(input, dependencies)),
          );
          expect(roundTripped).toEqual(input);
        },
      ),
    );
  });
});
