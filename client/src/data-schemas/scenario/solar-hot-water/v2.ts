import { z } from 'zod';
import { assertNever } from '../../../helpers/assert-never';
import { solarHotWaterInput } from '../../../model/modules/solar-hot-water';
import { makeZodSchema } from '../../visitable-types/zod';
import { SolarHotWaterV1 } from './v1';

export const shwV2 = z.object({
  version: z.literal(2),
  input: makeZodSchema(solarHotWaterInput),
});

export type SolarHotWaterV2 = z.infer<typeof shwV2>;

export function migrateV1ToV2(v1: SolarHotWaterV1): SolarHotWaterV2 {
  const out: SolarHotWaterV2 = {
    version: 2,
    input: null,
  };
  if (
    v1.pump !== undefined &&
    v1.input.dedicatedSolarStorageVolume !== null &&
    v1.input.collector.parameterSource !== null &&
    v1.input.collector.apertureArea !== null &&
    v1.input.collector.inclination !== null &&
    v1.input.collector.overshading !== null &&
    v1.input.collector.orientation !== null
  ) {
    let parameters:
      | Exclude<SolarHotWaterV2['input'], null>['collector']['parameters']
      | null = null;
    switch (v1.input.collector.parameterSource) {
      case 'estimate': {
        if (
          v1.input.collector.estimate.collectorType !== null &&
          v1.input.collector.estimate.apertureAreaType !== null
        ) {
          parameters = {
            source: 'estimate',
            collectorType: v1.input.collector.estimate.collectorType,
            apertureAreaType: v1.input.collector.estimate.apertureAreaType,
          };
        }
        break;
      }
      case 'test certificate': {
        if (
          v1.input.collector.testCertificate.zeroLossEfficiency !== null &&
          v1.input.collector.testCertificate.linearHeatLossCoefficient !== null &&
          v1.input.collector.testCertificate.secondOrderHeatLossCoefficient !== null
        ) {
          parameters = {
            source: 'test certificate',
            zeroLossEfficiency: v1.input.collector.testCertificate.zeroLossEfficiency,
            linearHeatLossCoefficient:
              v1.input.collector.testCertificate.linearHeatLossCoefficient,
            secondOrderHeatLossCoefficient:
              v1.input.collector.testCertificate.secondOrderHeatLossCoefficient,
          };
        }
        break;
      }
      default:
        assertNever(v1.input.collector.parameterSource);
    }
    out.input =
      parameters === null
        ? null
        : {
            pump: v1.pump,
            combinedCylinderVolume: v1.input.combinedCylinderVolume ?? 0,
            dedicatedSolarStorageVolume: v1.input.dedicatedSolarStorageVolume,
            collector: {
              apertureArea: v1.input.collector.apertureArea,
              inclination: v1.input.collector.inclination,
              orientation: v1.input.collector.orientation,
              overshading: v1.input.collector.overshading,
              parameters,
            },
          };
  }
  return out;
}
