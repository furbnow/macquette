import fc from 'fast-check';
import { mapValues } from 'lodash';
import { scenarioSchema } from '../../src/data-schemas/scenario';
import {
  CurrentEnergy,
  CurrentEnergyDependencies,
  CurrentEnergyInput,
  extractCurrentEnergyInputFromLegacy,
} from '../../src/model/modules/current-energy';
import { sensibleFloat } from '../arbitraries/legacy-values';
import { legacyCurrentEnergy } from './golden-master/current-energy';

const disallowedFuelNames = Object.getOwnPropertyNames(Object.getPrototypeOf({}));
const arbCurrentEnergyInput: fc.Arbitrary<CurrentEnergyInput> = fc.record({
  annualEnergyByFuel: fc.dictionary(
    fc.string().filter((val) => !disallowedFuelNames.includes(val)),
    sensibleFloat,
  ),
  generation: fc.option(
    fc.record({
      annualEnergy: sensibleFloat,
      fractionUsedOnsite: sensibleFloat,
      annualFeedInTariffIncome: sensibleFloat,
    }),
  ),
});
type TestDependencies = Omit<CurrentEnergyDependencies, 'modelBehaviourFlags'>;
const arbDependencyFuel = fc.record({
  standingCharge: sensibleFloat,
  unitPrice: sensibleFloat,
  carbonEmissionsFactor: sensibleFloat,
  primaryEnergyFactor: sensibleFloat,
});
function arbCurrentEnergyDependencies(
  fuelNames: string[],
): fc.Arbitrary<TestDependencies> {
  return fc.record({
    fuels: fc.record({
      generation: arbDependencyFuel,
      fuels: fc.record({
        ...Object.fromEntries(
          fuelNames.map((name) => [name, arbDependencyFuel] as const),
        ),
      }),
    }),
  });
}

function makeLegacyDataForCurrentEnergy(
  input: CurrentEnergyInput,
  dependencies: TestDependencies,
) {
  return {
    currentenergy: {
      use_by_fuel: mapValues(input.annualEnergyByFuel, (annual_use) => ({
        annual_use,
      })),
      onsite_generation: input.generation !== null ? 1 : false,
      generation:
        input.generation === null
          ? undefined
          : {
              annual_generation: input.generation.annualEnergy,
              fraction_used_onsite: input.generation.fractionUsedOnsite,
              annual_FIT_income: input.generation.annualFeedInTariffIncome,
            },
    },
    fuels: {
      ...mapValues(dependencies.fuels.fuels, (fuel) => ({
        co2factor: fuel.carbonEmissionsFactor,
        primaryenergyfactor: fuel.primaryEnergyFactor,
        standingcharge: fuel.standingCharge,
        fuelcost: fuel.unitPrice,
        category: 'Electricity',
      })),
      generation: {
        co2factor: dependencies.fuels.generation.carbonEmissionsFactor,
        primaryenergyfactor: dependencies.fuels.generation.primaryEnergyFactor,
        standingcharge: dependencies.fuels.generation.standingCharge,
        fuelcost: dependencies.fuels.generation.unitPrice,
        category: 'generation',
      },
    },
  };
}

describe('current energy', () => {
  test('golden master', () => {
    const arb = arbCurrentEnergyInput.chain((input) =>
      fc.record({
        input: fc.constant(input),
        dependencies: arbCurrentEnergyDependencies(Object.keys(input.annualEnergyByFuel)),
      }),
    );
    fc.assert(
      fc.property(arb, ({ input, dependencies }) => {
        const currentEnergy = new CurrentEnergy(input, {
          ...dependencies,
          modelBehaviourFlags: {
            currentEnergy: {
              countSavingsCorrectlyInUsage: false,
              calculateSavingsIncorporatingOnsiteUse: false,
            },
          },
        });
        const legacyData: any = makeLegacyDataForCurrentEnergy(input, dependencies);
        legacyCurrentEnergy(legacyData);
        expect(currentEnergy.annualCarbonEmissions).toBeApproximately(
          legacyData.currentenergy.total_co2,
        );
        expect(currentEnergy.annualGrossCost).toBeApproximately(
          legacyData.currentenergy.total_cost,
        );
        expect(currentEnergy.annualNetCost).toBeApproximately(
          legacyData.currentenergy.annual_net_cost,
        );
        expect(currentEnergy.annualEnergyEndUse).toBeApproximately(
          legacyData.currentenergy.enduse_annual_kwh,
        );
        expect(currentEnergy.annualPrimaryEnergy).toBeApproximately(
          legacyData.currentenergy.primaryenergy_annual_kwh,
        );
        /* eslint-disable jest/no-conditional-expect */
        if (currentEnergy.generation !== null) {
          expect(currentEnergy.generation.annualPrimaryEnergySaved).toBeApproximately(
            legacyData.currentenergy.generation.primaryenergy,
          );
          expect(currentEnergy.generation.annualCarbonEmissionsSaved).toBeApproximately(
            legacyData.currentenergy.generation.annual_CO2,
          );
          expect(currentEnergy.generation.annualCostSaved).toBeApproximately(
            legacyData.currentenergy.generation.annual_savings,
          );
        }
        /* eslint-enable */
        for (const fuelName of Object.keys(input.annualEnergyByFuel)) {
          const fuel = currentEnergy.fuels[fuelName];
          expect(fuel).toBeDefined();
          const legacyFuel = legacyData.currentenergy.use_by_fuel[fuelName];
          expect(legacyFuel).toBeDefined();
          expect(fuel!.annualUse).toBeApproximately(legacyFuel.annual_use);
          expect(fuel!.annualCarbonEmissions).toBeApproximately(legacyFuel.annual_co2);
          expect(fuel!.annualPrimaryEnergy).toBeApproximately(legacyFuel.primaryenergy);
          expect(fuel!.annualCost).toBeApproximately(legacyFuel.annualcost);
        }
      }),
    );
  });

  test('extractor', () => {
    const arb = arbCurrentEnergyInput.chain((input) =>
      fc.record({
        input: fc.constant(input),
        dependencies: arbCurrentEnergyDependencies(Object.keys(input.annualEnergyByFuel)),
      }),
    );
    fc.assert(
      fc.property(arb, ({ input, dependencies }) => {
        const roundTripped = extractCurrentEnergyInputFromLegacy(
          scenarioSchema.parse(makeLegacyDataForCurrentEnergy(input, dependencies)),
        );
        expect(roundTripped).toEqual(input);
      }),
    );
  });
});
