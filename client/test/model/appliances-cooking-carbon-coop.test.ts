import fc from 'fast-check';
import { cloneDeep } from 'lodash';
import { scenarioSchema } from '../../src/data-schemas/scenario';
import { sum } from '../../src/helpers/array-reducers';
import { Month } from '../../src/model/enums/month';
import { Fuels } from '../../src/model/modules/fuels';
import {
  AppliancesCookingCarbonCoop,
  AppliancesCookingCarbonCoopDependencies,
  AppliancesCookingCarbonCoopInput,
  FuelType,
  appliancesCookingCarbonCoopInput,
  extractAppliancesCarbonCoopInputFromLegacy,
} from '../../src/model/modules/lighting-appliances-cooking/appliances-cooking-carbon-coop';
import { makeArbitrary } from '../helpers/make-arbitrary';
import { legacyApplianceCarbonCoop } from './golden-master/appliance-carbon-coop';

function withSuppressedConsoleWarn<T>(fn: () => T): T {
  const oldConsoleWarn = console.warn;
  console.warn = () => undefined;
  try {
    return fn();
  } finally {
    console.warn = oldConsoleWarn;
  }
}

const arbAppliancesCookingCarbonCoopInput = makeArbitrary(
  appliancesCookingCarbonCoopInput,
);
const arbAppliancesCookingCarbonCoopDependencies: fc.Arbitrary<AppliancesCookingCarbonCoopDependencies> =
  fc.record({
    fuels: fc.record({ names: fc.array(fc.string()) }),
    modelBehaviourFlags: fc.record({
      carbonCoopAppliancesCooking: fc.record({
        treatMonthlyGainAsPower: fc.boolean(),
        convertGainsToWatts: fc.boolean(),
        useFuelInputForFuelFraction: fc.boolean(),
        useWeightedMonthsForEnergyDemand: fc.boolean(),
      }),
    }),
  });

function makeLegacyDataForAppliancesCookingCarbonCoop(
  input: AppliancesCookingCarbonCoopInput,
) {
  return {
    LAC_calculation_type: 'carboncoop_SAPlighting',
    fuel_requirements: {
      cooking: { quantity: 0, list: [] },
      appliances: { quantity: 0, list: [] },
    },
    energy_requirements: { appliances: {}, cooking: {} },
    gains_W: {},
    applianceCarbonCoop: {
      list: input.map((load) => {
        let type_of_fuel: string;
        switch (load.fuel.type) {
          case 'electricity':
            type_of_fuel = 'Electricity';
            break;
          case 'gas':
            type_of_fuel = 'Gas';
            break;
          case 'oil':
            type_of_fuel = 'Oil';
            break;
        }
        let category: string;
        switch (load.category) {
          case 'appliances':
            category = 'Appliances';
            break;
          case 'cooking':
            category = 'Cooking';
            break;
        }
        return {
          fuel: load.fuel.name,
          type_of_fuel,
          efficiency: load.fuel.efficiency,
          number_used: load.numberUsed,
          a_plus_rated: load.aPlusRated ? 1 : false,
          norm_demand: load.normalisedDemand,
          utilisation_factor: load.utilisationFactor,
          reference_quantity: load.referenceQuantity,
          frequency: load.annualUseFrequency,
          category,
        };
      }),
    },
  };
}
describe('appliances & cooking Carbon Coop', () => {
  test('golden master', () => {
    // Disallow "toString", "__proto__", etc. as fuel names. These cause
    // prototype pollution in the legacy fuel requirements calcs.
    const disallowedFuelNames = Object.getOwnPropertyNames(Object.getPrototypeOf({}));

    withSuppressedConsoleWarn(() =>
      fc.assert(
        fc.property(
          arbAppliancesCookingCarbonCoopInput.filter(
            (input) =>
              !input.some((load) => disallowedFuelNames.includes(load.fuel.name)),
          ),
          arbAppliancesCookingCarbonCoopDependencies,
          (input, dependencies_) => {
            const dependencies = cloneDeep(dependencies_);
            dependencies.fuels.names.push(...input.map(({ fuel }) => fuel.name));
            const appliancesCookingCarbonCoop = new AppliancesCookingCarbonCoop(
              input,
              dependencies,
            );
            const legacyData: any = makeLegacyDataForAppliancesCookingCarbonCoop(input);
            legacyApplianceCarbonCoop(legacyData);

            // Energy demand
            expect(
              legacyData.applianceCarbonCoop.energy_demand_total.appliances,
            ).toBeApproximately(
              appliancesCookingCarbonCoop.appliances.energyDemandAnnual,
            );
            expect(
              legacyData.applianceCarbonCoop.energy_demand_total.cooking,
            ).toBeApproximately(appliancesCookingCarbonCoop.cooking.energyDemandAnnual);
            expect(
              legacyData.applianceCarbonCoop.energy_demand_total.total,
            ).toBeApproximately(
              appliancesCookingCarbonCoop.appliances.energyDemandAnnual +
                appliancesCookingCarbonCoop.cooking.energyDemandAnnual,
            );

            // Gains
            if (
              !dependencies.modelBehaviourFlags.carbonCoopAppliancesCooking
                .convertGainsToWatts
            ) {
              // eslint-disable-next-line jest/no-conditional-expect
              expect(legacyData.applianceCarbonCoop.gains_W.Appliances).toBeApproximately(
                appliancesCookingCarbonCoop.appliances.heatGainAverageAnnual,
              );
              // eslint-disable-next-line jest/no-conditional-expect
              expect(legacyData.applianceCarbonCoop.gains_W.Cooking).toBeApproximately(
                appliancesCookingCarbonCoop.cooking.heatGainAverageAnnual,
              );
            }

            // Fuel
            expect(
              legacyData.applianceCarbonCoop.fuel_input_total.appliances,
            ).toBeApproximately(appliancesCookingCarbonCoop.appliances.fuelInputAnnual);
            expect(
              legacyData.applianceCarbonCoop.fuel_input_total.cooking,
            ).toBeApproximately(appliancesCookingCarbonCoop.cooking.fuelInputAnnual);
            for (const fuelType of ['electricity', 'gas', 'oil'] as const) {
              expect(
                legacyData.applianceCarbonCoop.energy_demand_by_type_of_fuel[
                  toLegacyFuelTypeName(fuelType)
                ] ?? 0,
              ).toBeApproximately(
                appliancesCookingCarbonCoop.appliances.energyDemandAnnualByFuelType(
                  fuelType,
                ) +
                  appliancesCookingCarbonCoop.cooking.energyDemandAnnualByFuelType(
                    fuelType,
                  ),
              );
            }
            expect(legacyData.fuel_requirements.appliances.list).toHaveLength(
              Object.keys(appliancesCookingCarbonCoop.appliances.fuelInfoAnnualByFuel)
                .length,
            );
            expect(legacyData.fuel_requirements.cooking.list).toHaveLength(
              Object.keys(appliancesCookingCarbonCoop.cooking.fuelInfoAnnualByFuel)
                .length,
            );
            for (const section of ['appliances', 'cooking'] as const) {
              for (const legacyFuelRequirement of legacyData.fuel_requirements[section]
                .list) {
                const fuelInfo =
                  appliancesCookingCarbonCoop[section].fuelInfoAnnualByFuel[
                    legacyFuelRequirement.fuel
                  ]!;
                expect(legacyFuelRequirement.demand).toBeApproximately(
                  fuelInfo.energyDemand,
                );
                if (
                  !dependencies.modelBehaviourFlags.carbonCoopAppliancesCooking
                    .useFuelInputForFuelFraction
                ) {
                  // eslint-disable-next-line jest/no-conditional-expect
                  expect(legacyFuelRequirement.fraction).toBeApproximately(
                    fuelInfo.fraction,
                  );
                }
                expect(legacyFuelRequirement.fuel_input).toBeApproximately(
                  fuelInfo.fuelInput,
                );
              }
            }

            // By load
            const combinedLoads = [
              ...appliancesCookingCarbonCoop.appliances.loads,
              ...appliancesCookingCarbonCoop.cooking.loads,
            ];
            (legacyData.applianceCarbonCoop.list as any[]).forEach(
              (legacyLoad, index) => {
                const load = combinedLoads.find(
                  (load) => load.input.originalIndex === index,
                );
                expect(load).toBeDefined();
                expect(legacyLoad.energy_demand).toBeApproximately(
                  load!.energyDemandAnnual,
                );
                expect(legacyLoad.fuel_input).toBeApproximately(load!.fuelInputAnnual);
              },
            );

            // By month
            for (const month of Month.all) {
              // Energy
              if (
                !dependencies.modelBehaviourFlags.carbonCoopAppliancesCooking
                  .useWeightedMonthsForEnergyDemand
              ) {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(
                  legacyData.applianceCarbonCoop.energy_demand_monthly.appliances[
                    month.index0
                  ],
                ).toBeApproximately(
                  appliancesCookingCarbonCoop.appliances.energyDemandMonthly(month),
                );
                // eslint-disable-next-line jest/no-conditional-expect
                expect(
                  legacyData.applianceCarbonCoop.energy_demand_monthly.cooking[
                    month.index0
                  ],
                ).toBeApproximately(
                  appliancesCookingCarbonCoop.cooking.energyDemandMonthly(month),
                );
                // eslint-disable-next-line jest/no-conditional-expect
                expect(
                  legacyData.applianceCarbonCoop.energy_demand_monthly.total[
                    month.index0
                  ],
                ).toBeApproximately(
                  appliancesCookingCarbonCoop.appliances.energyDemandMonthly(month) +
                    appliancesCookingCarbonCoop.cooking.energyDemandMonthly(month),
                );
              }

              // Gains
              if (
                !dependencies.modelBehaviourFlags.carbonCoopAppliancesCooking
                  .convertGainsToWatts &&
                !dependencies.modelBehaviourFlags.carbonCoopAppliancesCooking
                  .treatMonthlyGainAsPower
              ) {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(
                  legacyData.applianceCarbonCoop.gains_W_monthly.Appliances[month.index0],
                ).toBeApproximately(
                  appliancesCookingCarbonCoop.appliances.heatGainAverageMonthly(month),
                );
                // eslint-disable-next-line jest/no-conditional-expect
                expect(
                  legacyData.applianceCarbonCoop.gains_W_monthly.Cooking[month.index0],
                ).toBeApproximately(
                  appliancesCookingCarbonCoop.cooking.heatGainAverageMonthly(month),
                );
              }
            }
          },
        ),
      ),
    );
  });

  test('extractor', () => {
    withSuppressedConsoleWarn(() => {
      fc.assert(
        fc.property(arbAppliancesCookingCarbonCoopInput, (input) => {
          const roundTripped = extractAppliancesCarbonCoopInputFromLegacy(
            scenarioSchema.parse(makeLegacyDataForAppliancesCookingCarbonCoop(input)),
          );
          expect(roundTripped).toEqual(input);
        }),
      );
    });
  });

  test('when treatMonthlyGainAsPower is enabled, monthly gains equal annual gains', () => {
    withSuppressedConsoleWarn(() => {
      fc.assert(
        fc.property(
          arbAppliancesCookingCarbonCoopInput,
          arbAppliancesCookingCarbonCoopDependencies.filter(
            (deps) =>
              deps.modelBehaviourFlags.carbonCoopAppliancesCooking
                .treatMonthlyGainAsPower === true,
          ),
          (input, dependencies_) => {
            const dependencies = cloneDeep(dependencies_);
            dependencies.fuels.names.push(...input.map(({ fuel }) => fuel.name));
            const appliancesCookingCarbonCoop = new AppliancesCookingCarbonCoop(
              input,
              dependencies,
            );
            for (const category of ['appliances', 'cooking'] as const) {
              for (const month of Month.all) {
                expect(
                  appliancesCookingCarbonCoop[category].heatGainAverageMonthly(month),
                ).toBe(appliancesCookingCarbonCoop[category].heatGainAverageAnnual);
              }
            }
          },
        ),
      );
    });
  });

  test('monthly energy demands sum to annual energy demand', () => {
    withSuppressedConsoleWarn(() => {
      fc.assert(
        fc.property(
          arbAppliancesCookingCarbonCoopInput,
          arbAppliancesCookingCarbonCoopDependencies,
          (input, dependencies_) => {
            const dependencies = cloneDeep(dependencies_);
            dependencies.fuels.names.push(...input.map(({ fuel }) => fuel.name));
            const appliancesCookingCarbonCoop = new AppliancesCookingCarbonCoop(
              input,
              dependencies,
            );
            for (const category of ['appliances', 'cooking'] as const) {
              const sumMonthly = sum(
                Month.all.map((month) =>
                  appliancesCookingCarbonCoop[category].energyDemandMonthly(month),
                ),
              );
              expect(sumMonthly).toBeApproximately(
                appliancesCookingCarbonCoop[category].energyDemandAnnual,
              );
            }
          },
        ),
      );
    });
  });

  test('gains are computed correctly with example data', () => {
    const input: AppliancesCookingCarbonCoopInput = [
      // Laptop
      {
        numberUsed: 2,
        aPlusRated: false,
        normalisedDemand: 42,
        utilisationFactor: 1,
        referenceQuantity: 1,
        annualUseFrequency: 1,
        fuel: { type: 'electricity', name: Fuels.STANDARD_TARIFF, efficiency: 1 },
        category: 'appliances',
      },
      // Fridge-freezer
      {
        numberUsed: 1,
        aPlusRated: true,
        normalisedDemand: 2,
        utilisationFactor: 1,
        referenceQuantity: 1,
        annualUseFrequency: 365,
        fuel: { type: 'electricity', name: Fuels.STANDARD_TARIFF, efficiency: 1 },
        category: 'appliances',
      },
    ];
    const dependencies: AppliancesCookingCarbonCoopDependencies = {
      fuels: { names: [Fuels.STANDARD_TARIFF] },
      modelBehaviourFlags: {
        carbonCoopAppliancesCooking: {
          treatMonthlyGainAsPower: true,
          convertGainsToWatts: true,
          useWeightedMonthsForEnergyDemand: true,
          useFuelInputForFuelFraction: true,
        },
      },
    };
    const appliancesCookingCarbonCoop = new AppliancesCookingCarbonCoop(
      input,
      dependencies,
    );
    const kWhPerYearToWatts = 1000 / (365 * 24);
    const kWhPerDayToWatts = 1000 / 24;
    const aPlusAdjustment = 0.75;
    expect(appliancesCookingCarbonCoop.appliances.heatGainAverageAnnual).toBe(
      2 * 42 * kWhPerYearToWatts + 2 * kWhPerDayToWatts * aPlusAdjustment,
    );
  });
});

function toLegacyFuelTypeName(fuelType: FuelType): string {
  switch (fuelType) {
    case 'electricity':
      return 'Electricity';
    case 'gas':
      return 'Gas';
    case 'oil':
      return 'Oil';
  }
}
