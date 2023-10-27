import { z } from 'zod';

import { nullableStringyFloat } from '../scenario/value-schemas';
import {
  libraryItemCommonSchema,
  makeLibrarySchema,
  measureCommonSchema,
  withGenericTags,
} from './common';

const item = z
  .object({
    source: z.string(),
    ventilation_type: z.enum(['NV', 'IE', 'MEV', 'PS', 'MVHR', 'MV', 'DEV']),
    specific_fan_power: z.string(),
    system_air_change_rate: nullableStringyFloat,
    balanced_heat_recovery_efficiency: nullableStringyFloat,
  })
  .merge(libraryItemCommonSchema)
  .merge(withGenericTags)
  .passthrough();

const measure = item.merge(measureCommonSchema).passthrough();

export const ventilationSystems = makeLibrarySchema('ventilation_systems', item);
export const ventilationSystemsMeasures = makeLibrarySchema(
  'ventilation_systems_measures',
  measure,
);
