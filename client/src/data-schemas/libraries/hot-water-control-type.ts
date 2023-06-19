import { z } from 'zod';

import {
    libraryItemCommonSchema,
    makeLibrarySchema,
    measureCommonSchema,
} from './common';

const measure = z
    .object({
        source: z.string(),
        control_type: z.string(),
    })
    .merge(libraryItemCommonSchema)
    .merge(measureCommonSchema)
    .passthrough();

export const hotWaterControlTypeMeasures = makeLibrarySchema(
    'hot_water_control_type',
    measure,
);
