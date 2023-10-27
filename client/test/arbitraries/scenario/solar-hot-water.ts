import fc from 'fast-check';
import { pick } from 'lodash';
import { z } from 'zod';
import { solarHotWaterSchema } from '../../../src/data-schemas/scenario/solar-hot-water';

import { solarHotWaterDataModel } from '../../../src/data-schemas/scenario/solar-hot-water/v2';
import { makeArbitrary } from '../../helpers/make-arbitrary';
import { flatten } from '../../helpers/object-flattening';

export const arbSolarHotWaterV2: fc.Arbitrary<z.input<typeof solarHotWaterSchema>> =
  fc.record({
    version: fc.constant(2 as const),
    input: makeArbitrary(solarHotWaterDataModel),
  });

export function shwInputIsComplete(SHW: z.input<typeof solarHotWaterSchema>): boolean {
  if (!('version' in SHW)) {
    const inputs = pick(SHW, ...shwLegacyInputKeys);
    const isComplete = shwLegacyInputKeys.reduce(
      (allInputsWerePresent, key) => allInputsWerePresent && inputs[key] !== undefined,
      true,
    );
    return isComplete;
  } else {
    switch (SHW.version) {
      case 1: {
        const flattened = flatten(SHW);
        const isIncomplete = Array.from(flattened.values()).some(
          (value) => value === null,
        );
        return !isIncomplete;
      }
      case 2: {
        return SHW.input !== null;
      }
    }
  }
}

export const shwLegacyInputKeys = [
  'pump',
  'A',
  'n0',
  'a1',
  'a2',
  'orientation',
  'inclination',
  'overshading',
  'Vs',
  'combined_cylinder_volume',
] as const;
