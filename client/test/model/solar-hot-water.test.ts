import assert from 'assert';
import fc from 'fast-check';

import { scenarioSchema } from '../../src/data-schemas/scenario';
import { solarHotWaterOvershadingFactor } from '../../src/model/datasets';
import { Orientation } from '../../src/model/enums/orientation';
import {
  SolarHotWaterDependencies,
  SolarHotWaterEnabled,
  SolarHotWaterInput,
  constructSolarHotWater,
  solarHotWaterInput,
} from '../../src/model/modules/solar-hot-water';
import { sensibleFloat } from '../arbitraries/legacy-values';
import { arbitraryRegion } from '../helpers/arbitrary-enums';
import { makeArbitrary } from '../helpers/make-arbitrary';
import { legacySolarHotWater } from './golden-master/solar-hot-water';

const arbSolarHotWaterInput = makeArbitrary(solarHotWaterInput);
function arbSolarHotWaterDependencies(
  { alwaysOn } = { alwaysOn: false },
): fc.Arbitrary<SolarHotWaterDependencies> {
  return fc.record({
    region: arbitraryRegion,
    waterCommon: fc.record({
      dailyHotWaterUsageLitresMeanAnnual: sensibleFloat,
      hotWaterEnergyContentAnnual: sensibleFloat,
      solarHotWater: alwaysOn ? fc.constant(true) : fc.boolean(),
    }),
  });
}

type LegacyCompatibleInput = Omit<NonNullable<SolarHotWaterInput>, 'collector'> & {
  collector: Omit<NonNullable<SolarHotWaterInput>['collector'], 'parameters'> & {
    parameters: Extract<
      NonNullable<SolarHotWaterInput>['collector']['parameters'],
      { source: 'test certificate' }
    >;
  };
};
function isLegacyCompatibleInput(
  input: SolarHotWaterInput,
): input is LegacyCompatibleInput {
  return input !== null && input.collector.parameters.source === 'test certificate';
}

function makeLegacyDataForSolarHotWater(
  input: LegacyCompatibleInput,
  dependencies: SolarHotWaterDependencies,
) {
  const SHW: Record<string, unknown> = {
    pump: input.pump,
    Vs: input.dedicatedSolarStorageVolume,
    combined_cylinder_volume: input.combinedCylinderVolume,
    A: input.collector.apertureArea,
    orientation: new Orientation(input.collector.orientation).index0,
    overshading: solarHotWaterOvershadingFactor(input.collector.overshading),
    inclination: input.collector.inclination,
    n0: input.collector.parameters.zeroLossEfficiency,
    a1: input.collector.parameters.linearHeatLossCoefficient,
    a2: input.collector.parameters.secondOrderHeatLossCoefficient,
  };
  return {
    region: dependencies.region.index0,
    water_heating: {
      annual_energy_content: dependencies.waterCommon.hotWaterEnergyContentAnnual,
      Vd_average: dependencies.waterCommon.dailyHotWaterUsageLitresMeanAnnual,
    },
    SHW,
  };
}

describe('solar hot water module', () => {
  test('the result of an estimate is equal to the result of the same input but with the values from the table', () => {
    fc.assert(
      fc.property(
        arbSolarHotWaterInput.filter(
          (input) =>
            input !== null &&
            input.collector.parameters.source === 'estimate' &&
            input.collector.parameters.apertureAreaType === 'gross',
        ),
        arbSolarHotWaterDependencies(),
        (input, dependencies) => {
          assert(input !== null);
          assert(input.collector.parameters.source === 'estimate');
          const { apertureArea } = input.collector;
          let desiredAStar: number;
          let desiredZeroLossEfficiency: number;
          let desiredExactApertureArea: number;
          switch (input.collector.parameters.collectorType) {
            case 'evacuated tube': {
              desiredAStar = 3;
              desiredZeroLossEfficiency = 0.6;
              desiredExactApertureArea = 0.72 * apertureArea;
              break;
            }
            case 'flat plate, glazed': {
              desiredAStar = 6;
              desiredZeroLossEfficiency = 0.75;
              desiredExactApertureArea = 0.9 * apertureArea;
              break;
            }
            case 'unglazed': {
              desiredAStar = 20;
              desiredZeroLossEfficiency = 0.9;
              desiredExactApertureArea = apertureArea;
              break;
            }
          }
          const fakeLinearCoefficient = desiredAStar / 0.892;
          const supposedlyEquivalentInput: typeof input = {
            ...input,
            collector: {
              ...input.collector,
              apertureArea: desiredExactApertureArea,
              parameters: {
                source: 'test certificate',
                linearHeatLossCoefficient: fakeLinearCoefficient,
                secondOrderHeatLossCoefficient: 0,
                zeroLossEfficiency: desiredZeroLossEfficiency,
              },
            },
          };
          const estimateModel = constructSolarHotWater(input, dependencies);
          const equivalentExactModel = constructSolarHotWater(
            supposedlyEquivalentInput,
            dependencies,
          );
          expect(equivalentExactModel.solarInputAnnual).toBe(
            estimateModel.solarInputAnnual,
          );
        },
      ),
    );
  });

  test('golden master', () => {
    fc.assert(
      fc.property(
        arbSolarHotWaterInput
          .filter(isLegacyCompatibleInput)
          .filter((input) => input.dedicatedSolarStorageVolume !== 0),
        arbSolarHotWaterDependencies({ alwaysOn: true }),
        (input, dependencies) => {
          const solarHotWater = new SolarHotWaterEnabled(input, dependencies);
          const legacyData: any = makeLegacyDataForSolarHotWater(input, dependencies);
          legacySolarHotWater(legacyData);
          expect(solarHotWater.aStar).toBeApproximately(legacyData.SHW.a);
          expect(solarHotWater.collectorPerformanceRatio).toBeApproximately(
            legacyData.SHW.collector_performance_ratio,
          );
          expect(solarHotWater.solarRadiationAnnual).toBeApproximately(
            legacyData.SHW.annual_solar,
          );
          expect(solarHotWater.solarEnergyAvailable).toBeApproximately(
            legacyData.SHW.solar_energy_available,
          );
          expect(solarHotWater.solarToLoadRatio).toBeApproximately(
            legacyData.SHW.solar_load_ratio,
          );
          expect(solarHotWater.utilisationFactor).toBeApproximately(
            legacyData.SHW.utilisation_factor,
          );
          expect(solarHotWater.collectorPerformanceFactor).toBeApproximately(
            legacyData.SHW.collector_performance_factor,
          );
          expect(solarHotWater.effectiveSolarVolume).toBeApproximately(
            legacyData.SHW.Veff,
          );
          expect(solarHotWater.volumeRatio).toBeApproximately(
            legacyData.SHW.volume_ratio,
          );
          expect(solarHotWater.solarInputAnnual).toBeApproximately(legacyData.SHW.Qs);
        },
      ),
    );
  });

  test('schema round trip', () => {
    fc.assert(
      fc.property(
        arbSolarHotWaterInput.filter(isLegacyCompatibleInput),
        arbSolarHotWaterDependencies(),
        (input, dependencies) => {
          const roundTripped = scenarioSchema.parse(
            makeLegacyDataForSolarHotWater(input, dependencies),
          )?.SHW?.input;
          expect(roundTripped).toEqual(input);
        },
      ),
    );
  });
});
