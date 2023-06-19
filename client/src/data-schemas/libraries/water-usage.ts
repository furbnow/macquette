import { z } from 'zod';

import {
    libraryItemCommonSchema,
    makeLibrarySchema,
    measureCommonSchema,
    withGenericTags,
} from './common';

const measure = z
    .object({
        source: z.string(),
    })
    .merge(libraryItemCommonSchema)
    .merge(measureCommonSchema)
    .merge(withGenericTags)
    .passthrough();

export const waterUsageMeasures = makeLibrarySchema('water_usage', measure);
