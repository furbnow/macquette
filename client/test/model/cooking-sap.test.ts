import fc from 'fast-check';
import { cloneDeep } from 'lodash';
import { scenarioSchema } from '../../src/data-schemas/scenario';
import { zip } from '../../src/helpers/zip';
import { Month } from '../../src/model/enums/month';
import { Fuels } from '../../src/model/modules/fuels';
import {
  CookingSAP,
  CookingSAPDependencies,
  CookingSAPInput,
  cookingSAPInput,
  extractCookingSAPInputFromLegacy,
} from '../../src/model/modules/lighting-appliances-cooking/cooking-sap';
import { sensibleFloat } from '../arbitraries/legacy-values';
import { makeArbitrary } from '../helpers/make-arbitrary';
import { legacyLightingAppliancesCooking } from './golden-master/lighting-appliances-cooking';

const arbCookingSAPInput = makeArbitrary(cookingSAPInput);
const arbCookingSAPDependencies: fc.Arbitrary<CookingSAPDependencies> = fc.record({
  fuels: fc.record({
    names: fc.array(fc.string()),
    standardTariff: fc.record({ carbonEmissionsFactor: sensibleFloat }),
  }),
  floors: fc.record({
    totalFloorArea: sensibleFloat.filter((value) => value >= 0),
  }),
  occupancy: fc.record({
    occupancy: sensibleFloat.filter((value) => value >= 0),
  }),
});

function makeLegacyDataForCookingSAP(
  input: CookingSAPInput,
  dependencies: CookingSAPDependencies,
) {
  return {
    occupancy: dependencies.occupancy.occupancy,
    TFA: dependencies.floors.totalFloorArea,
    LAC_calculation_type: 'SAP',
    LAC: {
      energy_efficient_cooking: input.energyEfficient,
      fuels_cooking: input.fuels.map(({ name, fraction }) => ({
        fuel: name,
        fraction,
      })),
    },
    fuel_requirements: {
      cooking: { quantity: 0 },
      lighting: { quantity: 0 },
      appliances: { quantity: 0 },
    },
    gains_W: {},
    energy_requirements: {},
    fuels: {
      [Fuels.STANDARD_TARIFF]: {
        co2factor: dependencies.fuels.standardTariff.carbonEmissionsFactor,
        primaryenergyfactor: 0,
        fuelcost: 0,
        standingcharge: 0,
        category: 'Electricity',
      },
    },
  };
}

describe('cooking SAP', () => {
  test('golden master', () => {
    fc.assert(
      fc.property(
        arbCookingSAPInput,
        arbCookingSAPDependencies,
        (input, dependencies_) => {
          const dependencies = cloneDeep(dependencies_);
          dependencies.fuels.names.push(...input.fuels.map((fuel) => fuel.name));
          const cookingSAP = new CookingSAP(input, dependencies);
          const legacyData: any = makeLegacyDataForCookingSAP(input, dependencies);
          legacyLightingAppliancesCooking(legacyData);
          expect(legacyData.LAC.EC).toBeApproximately(cookingSAP.energyAnnual);
          expect(legacyData.LAC.EC_monthly).toBeApproximately(cookingSAP.energyMonthly);
          expect(legacyData.LAC.fuels_cooking).toHaveLength(cookingSAP.fuelDemand.length);
          for (const month of Month.all) {
            expect(legacyData.gains_W.Cooking[month.index0]).toBeApproximately(
              cookingSAP.heatGainPower,
            );
          }
          for (const [legacyFuel, fuel] of zip(
            legacyData.LAC.fuels_cooking as any[],
            cookingSAP.fuelDemand,
          )) {
            expect(legacyFuel.fuel).toBe(fuel.fuel.name);
            expect(legacyFuel.demand).toBeApproximately(fuel.demand);
          }
          expect(legacyData.fuel_requirements.cooking.quantity).toBeApproximately(
            cookingSAP.totalFuelDemand,
          );
        },
      ),
    );
  });

  test('extractor', () => {
    fc.assert(
      fc.property(
        arbCookingSAPInput,
        arbCookingSAPDependencies,
        (input, dependencies) => {
          const roundTripped = extractCookingSAPInputFromLegacy(
            scenarioSchema.parse(makeLegacyDataForCookingSAP(input, dependencies)),
          );
          expect(roundTripped).toEqual(input);
        },
      ),
    );
  });
});
