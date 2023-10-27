import { z } from 'zod';

import { stringyFloatSchema } from '../scenario/value-schemas';
import {
  libraryItemCommonSchema,
  makeLibrarySchema,
  measureCommonSchema,
  withGenericTags,
} from './common';

const measure = z
  .object({
    kWp: stringyFloatSchema,
  })
  .merge(libraryItemCommonSchema)
  .merge(measureCommonSchema)
  .merge(withGenericTags)
  .passthrough();

export const generationMeasures = makeLibrarySchema('generation_measures', measure);
