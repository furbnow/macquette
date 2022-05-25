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
        type: z.string(),
        source: z.string(),
        ventilation_rate: stringyFloatSchema,
    })
    .merge(libraryItemCommonSchema)
    .merge(measureCommonSchema)
    .merge(withGenericTags)
    .passthrough();

export const extractVentilationPointsMeasures = makeLibrarySchema(
    'extract_ventilation_points',
    measure,
);
