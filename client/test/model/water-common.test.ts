import fc from 'fast-check';
import { Month } from '../../src/model/enums/month';
import {
  WaterCommon,
  WaterCommonDependencies,
  WaterCommonInput,
} from '../../src/model/modules/water-common';
import { sensibleFloat } from '../arbitraries/legacy-values';
import { legacyWaterHeating } from './golden-master/water-heating';
import { arbWaterCommonInput } from './water-common-arbitraries';

const arbWaterCommonDependencies: fc.Arbitrary<WaterCommonDependencies> = fc.record({
  occupancy: fc.record({
    occupancy: sensibleFloat,
  }),
});

function makeLegacyDataForWaterCommon(
  input: WaterCommonInput,
  dependencies: WaterCommonDependencies,
) {
  return {
    occupancy: dependencies.occupancy.occupancy,
    gains_W: {},
    energy_requirements: {},
    water_heating: {
      low_water_use_design: input.lowWaterUseDesign,
      override_annual_energy_content: input.annualEnergyContentOverride !== false,
      annual_energy_content:
        input.annualEnergyContentOverride !== false
          ? input.annualEnergyContentOverride
          : undefined,
    },
  };
}

describe('water common', () => {
  test('golden master', () => {
    fc.assert(
      fc.property(
        arbWaterCommonInput,
        arbWaterCommonDependencies,
        (input, dependencies) => {
          const waterCommon = new WaterCommon(input, dependencies);
          const legacyData: any = makeLegacyDataForWaterCommon(input, dependencies);
          legacyWaterHeating(legacyData);
          expect(waterCommon.dailyHotWaterUsageLitresMeanAnnual).toBeApproximately(
            legacyData.water_heating.Vd_average,
          );
          for (const month of Month.all) {
            expect(waterCommon.hotWaterEnergyContentByMonth(month)).toBeApproximately(
              legacyData.water_heating.monthly_energy_content[month.index0],
            );
          }
          expect(waterCommon.hotWaterEnergyContentAnnual).toBeApproximately(
            legacyData.water_heating.annual_energy_content,
          );
        },
      ),
    );
  });
});
