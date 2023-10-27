import fc from 'fast-check';
import { merge } from 'lodash';
import { isDeepStrictEqual } from 'util';
import { isNotNull } from '../../src/helpers/null-checking';
import { Month } from '../../src/model/enums/month';
import {
  WaterHeatingSystem,
  WaterHeatingSystemDependencies,
  WaterHeatingSystemInput,
  waterHeatingSystemInput,
} from '../../src/model/modules/heating-systems/water';
import {
  WaterCommon,
  WaterCommonDependencies,
  WaterCommonInput,
} from '../../src/model/modules/water-common';
import {
  WaterHeating,
  WaterHeatingDependencies,
  WaterHeatingInput,
  waterHeatingInput,
} from '../../src/model/modules/water-heating';
import { sensibleFloat } from '../arbitraries/legacy-values';
import { arbMonthly } from '../arbitraries/monthly';
import { makeArbitrary } from '../helpers/make-arbitrary';
import { legacyWaterHeating } from './golden-master/water-heating';
import { arbWaterCommonInput } from './water-common-arbitraries';

function withSuppressedConsoleWarn<T>(fn: () => T): T {
  const oldConsoleWarn = console.warn;
  console.warn = () => undefined;
  try {
    return fn();
  } finally {
    console.warn = oldConsoleWarn;
  }
}

const arbWaterHeatingSystemInput = makeArbitrary(waterHeatingSystemInput);
const arbWaterHeatingInput = makeArbitrary(waterHeatingInput);
type TestDependencies = Omit<
  WaterHeatingDependencies & WaterHeatingSystemDependencies & WaterCommonDependencies,
  'heatingSystems' | 'waterCommon'
>;
function arbDependencies(solarHotWater: boolean): fc.Arbitrary<TestDependencies> {
  return fc.record({
    solarHotWater: fc.record({
      solarInputMonthly: arbMonthly(solarHotWater ? sensibleFloat : fc.constant(0)),
    }),
    occupancy: fc.record({
      occupancy: sensibleFloat,
    }),
  });
}

describe('water heating', () => {
  test('golden master', () => {
    function makeLegacyDataForWaterHeating(
      input: WaterHeatingInput,
      systemsInput: Array<WaterHeatingSystemInput>,
      commonInput: WaterCommonInput,
      dependencies: TestDependencies,
    ): unknown {
      const out: Record<string, unknown> = {};
      merge(out, {
        occupancy: dependencies.occupancy.occupancy,
        gains_W: {},
        energy_requirements: {},
        water_heating: {
          low_water_use_design: commonInput.lowWaterUseDesign,
          override_annual_energy_content:
            commonInput.annualEnergyContentOverride !== false,
          annual_energy_content:
            commonInput.annualEnergyContentOverride !== false
              ? commonInput.annualEnergyContentOverride
              : undefined,
        },
      });
      if (input.storage !== null) {
        merge(out, {
          water_heating: {
            storage_type: {
              storage_volume: input.storage.volume,
            },
            contains_dedicated_solar_storage_or_WWHRS:
              input.storage.dedicatedSolarOrWWHRSStorage,
          },
        });
        switch (input.storage.type) {
          case 'declared loss factor': {
            merge(out, {
              water_heating: {
                storage_type: {
                  declared_loss_factor_known: true,
                  manufacturer_loss_factor: input.storage.manufacturerLossFactor,
                  temperature_factor_a: input.storage.temperatureFactor,
                },
              },
            });
            break;
          }
          case 'unknown loss factor': {
            merge(out, {
              water_heating: {
                storage_type: {
                  declared_loss_factor_known: false,
                  loss_factor_b: input.storage.lossFactor,
                  volume_factor_b: input.storage.volumeFactor,
                  temperature_factor_b: input.storage.temperatureFactor,
                },
              },
            });
            break;
          }
        }
      }
      merge(out, {
        water_heating: {
          community_heating: input.communityHeating,
          hot_water_store_in_dwelling: input.hotWaterStoreInDwelling,
        },
      });
      let Vc: number | undefined = undefined;
      let pipework_insulation: string | undefined = undefined;
      let hot_water_control_type: string | undefined = undefined;
      merge(out, {
        heating_systems: systemsInput.map((systemInput) => {
          let combi_loss;
          switch (systemInput.combiLoss?.type) {
            case undefined:
              combi_loss = undefined;
              break;
            case 'instantaneous': {
              if (systemInput.combiLoss.keepHotFacility === null) {
                combi_loss = 'Instantaneous, without keep hot-facility';
              } else if (systemInput.combiLoss.keepHotFacility.controlledByTimeClock) {
                combi_loss =
                  'Instantaneous, with keep-hot facility controlled by time clock';
              } else {
                combi_loss =
                  'Instantaneous, with keep-hot facility not controlled by time clock';
              }
              break;
            }
            case 'storage': {
              if (systemInput.combiLoss.capacity === '>= 55 litres') {
                combi_loss = 'Storage combi boiler >= 55 litres';
              } else {
                combi_loss = 'Storage combi boiler < 55 litres';
                Vc = systemInput.combiLoss.capacity;
              }
            }
          }
          switch (systemInput.primaryCircuitLoss?.pipeworkInsulation) {
            case 'uninsulated':
              pipework_insulation = 'Uninsulated primary pipework';
              break;
            case 'first metre':
              pipework_insulation = 'First 1m from cylinder insulated';
              break;
            case 'all accessible':
              pipework_insulation = 'All accesible piperwok insulated';
              break;
            case 'fully insulated':
              pipework_insulation = 'Fully insulated primary pipework';
              break;
          }
          switch (systemInput.primaryCircuitLoss?.hotWaterControl.type) {
            case 'no control':
              hot_water_control_type = 'no_cylinder_thermostat';
              break;
            case 'cylinder thermostat':
              if (
                systemInput.primaryCircuitLoss.hotWaterControl.separatelyTimedWaterHeating
              ) {
                hot_water_control_type =
                  'Cylinder thermostat, water heating separately timed';
              } else {
                hot_water_control_type =
                  'Cylinder thermostat, water heating not separately timed';
              }
              break;
          }
          return {
            provides: 'water',
            fraction_water_heating: systemInput.fractionWaterHeating,
            instantaneous_water_heating: !systemInput.distributionLoss,
            combi_loss,
            primary_circuit_loss: systemInput.primaryCircuitLoss !== null ? 'Yes' : 'No',
          };
        }),
      });
      merge(out, {
        water_heating: {
          pipework_insulation,
          hot_water_control_type,
          Vc,
          solar_water_heating: commonInput.solarHotWater,
        },
      });
      merge(out, {
        SHW: !commonInput.solarHotWater
          ? undefined
          : {
              Qs_monthly: Month.all.map((m) =>
                dependencies.solarHotWater.solarInputMonthly(m),
              ),
            },
      });
      return out;
    }

    function deepSame<T>(vals: T[]): boolean {
      if (vals.length === 0) return true;
      const [first, ...rest] = vals;
      return rest.every((item) => isDeepStrictEqual(item, first));
    }

    function areHeatingSystemsRepresentableInLegacyData(
      systemsInput: Array<WaterHeatingSystemInput>,
    ) {
      const pipeworkInsulationValues = systemsInput.map(
        (input) => input.primaryCircuitLoss?.pipeworkInsulation,
      );
      if (!deepSame(pipeworkInsulationValues)) return false;

      const hotWaterControlValues = systemsInput.map(
        (input) => input.primaryCircuitLoss?.hotWaterControl,
      );
      if (!deepSame(hotWaterControlValues)) return false;

      const combiLessThan55Values = systemsInput
        .map((input) =>
          input.combiLoss === null ||
          input.combiLoss.type !== 'storage' ||
          input.combiLoss.capacity === '>= 55 litres'
            ? null
            : input.combiLoss.capacity,
        )
        .filter(isNotNull);
      if (!deepSame(combiLessThan55Values)) return false;

      return true;
    }

    function heatingSystemIsSane(input: WaterHeatingSystemInput) {
      if (input.distributionLoss === false && input.combiLoss !== null) return false;
      if (input.distributionLoss === false && input.primaryCircuitLoss !== null) {
        return false;
      }
      if (input.combiLoss !== null && input.primaryCircuitLoss !== null) return false;
      if (input.fractionWaterHeating < 0) return false; // Note - keep the === 0 case since it is used in assessments
      return true;
    }

    function waterHeatingInputIsCompatibleWithLegacy(input: WaterHeatingInput) {
      if (input.storage !== null) {
        if (input.storage.volume === 0) {
          // Causes legacy to return NaNs
          return false;
        }
        if (input.storage.dedicatedSolarOrWWHRSStorage < 0) {
          // Causes discrepancies
          return false;
        }
      }
      return true;
    }

    withSuppressedConsoleWarn(() =>
      fc.assert(
        fc.property(
          arbWaterHeatingInput.filter(waterHeatingInputIsCompatibleWithLegacy),
          fc
            .array(arbWaterHeatingSystemInput.filter(heatingSystemIsSane))
            .filter(areHeatingSystemsRepresentableInLegacyData),
          arbWaterCommonInput.chain((commonInput) =>
            fc.record({
              commonInput: fc.constant(commonInput),
              dependencies: arbDependencies(commonInput.solarHotWater),
            }),
          ),
          (input, systemsInput, { commonInput, dependencies }) => {
            const waterCommon = new WaterCommon(commonInput, dependencies);
            const heatingSystems = {
              waterHeatingSystems: systemsInput.map(
                (systemInput) =>
                  new WaterHeatingSystem(systemInput, { ...dependencies, waterCommon }),
              ),
            };
            const waterHeating = new WaterHeating(input, {
              ...dependencies,
              waterCommon,
              heatingSystems,
            });
            const legacyData: any = makeLegacyDataForWaterHeating(
              input,
              systemsInput,
              commonInput,
              dependencies,
            );
            legacyWaterHeating(legacyData);

            // Incorporates all useful output and loss values, including WWHRS, Solar Hot Water
            expect(waterHeating.heatOutputAnnual).toBeApproximately(
              legacyData.water_heating.annual_waterheating_demand,
            );

            for (const month of Month.all) {
              const { kWhPerMonth, watts } = waterHeating.gainsMonthly(month);
              expect(kWhPerMonth).toBeApproximately(
                legacyData.water_heating.heat_gains_from_water_heating[month.index0],
              );
              expect(watts).toBeApproximately(
                legacyData.gains_W.waterheating[month.index0],
              );
            }
          },
        ),
      ),
    );
  });
});
