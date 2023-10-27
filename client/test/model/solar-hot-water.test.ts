import assert from 'assert';
import fc from 'fast-check';
import { solarHotWaterSchema } from '../../src/data-schemas/scenario/solar-hot-water';

import {
  constructSolarHotWater,
  SolarHotWaterDependencies,
} from '../../src/model/modules/solar-hot-water';
import { arbSolarHotWaterV2 } from '../arbitraries/scenario/solar-hot-water';
import { arbFloat } from '../helpers/arbitraries';
import { arbitraryRegion } from '../helpers/arbitrary-enums';

const arbitraryInput = arbSolarHotWaterV2.map(
  (input) => solarHotWaterSchema.parse(input).input,
);

function arbitraryDependencies(): fc.Arbitrary<SolarHotWaterDependencies> {
  return fc.record({
    region: arbitraryRegion,
    waterCommon: fc.record({
      dailyHotWaterUsageMeanAnnual: arbFloat(),
      hotWaterEnergyContentByMonth: fc.func(arbFloat()),
      hotWaterEnergyContentAnnual: arbFloat(),
      solarHotWater: fc.boolean(),
    }),
  });
}

describe('solar hot water module', () => {
  test('the result of an estimate is equal to the result of the same input but with the values from the table', () => {
    fc.assert(
      fc.property(
        arbitraryInput.filter(
          (input) =>
            input !== null &&
            input.collector.parameters.source === 'estimate' &&
            input.collector.parameters.apertureAreaType === 'gross',
        ),
        arbitraryDependencies(),
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
});
