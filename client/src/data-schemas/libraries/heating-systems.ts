import { z } from 'zod';

import { stringyFloatSchema } from '../scenario/value-schemas';
import {
  libraryItemCommonSchema,
  makeLibrarySchema,
  measureCommonSchema,
  withGenericTags,
} from './common';

const item = z
  .object({
    source: z.string(),
    category: z.enum([
      'Combi boilers',
      'Heat pumps',
      'Hot water only',
      'Room heaters',
      'System boilers',
      'Warm air systems',
    ]),
    combi_loss: stringyFloatSchema,
    responsiveness: stringyFloatSchema,
    summer_efficiency: stringyFloatSchema,
    winter_efficiency: stringyFloatSchema,
    central_heating_pump: stringyFloatSchema,
    primary_circuit_loss: z.enum(['Yes', 'No']),
    fans_and_supply_pumps: stringyFloatSchema,
  })
  .merge(libraryItemCommonSchema)
  .merge(withGenericTags)
  .passthrough();

const measure = item.merge(measureCommonSchema).strict();

export const heatingSystems = makeLibrarySchema('heating_systems', item);

export const heatingSystemsMeasures = makeLibrarySchema(
  'heating_systems_measures',
  measure,
);
