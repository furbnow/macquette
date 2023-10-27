import { z } from 'zod';

import {
  libraryItemCommonSchema,
  makeLibrarySchema,
  measureCommonSchema,
  withGenericTags,
} from './common';

const item = z
  .object({
    SELECT: z.string(),
    source: z.string(),
  })
  .merge(libraryItemCommonSchema)
  .merge(measureCommonSchema)
  .merge(withGenericTags)
  .passthrough();

export const pipeworkInsulation = makeLibrarySchema('pipework_insulation', item);
