import fc from 'fast-check';
import { WaterCommonInput } from '../../src/model/modules/water-common';
import { sensibleFloat } from '../arbitraries/legacy-values';

export const arbWaterCommonInput: fc.Arbitrary<WaterCommonInput> = fc.record({
  lowWaterUseDesign: fc.boolean(),
  annualEnergyContentOverride: fc.oneof(fc.constant(false as const), sensibleFloat),
  solarHotWater: fc.boolean(),
});
