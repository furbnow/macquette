import { z } from 'zod';

import { stringyFloatSchema } from '../helpers/legacy-numeric-values';
import {
    libraryItemCommonSchema,
    makeLibrarySchema,
    measureCommonSchema,
    withGenericTags,
} from './common';

const measure = z
    .object({
        q50: stringyFloatSchema,
        source: z.string(),
    })
    .merge(libraryItemCommonSchema)
    .merge(measureCommonSchema)
    .merge(withGenericTags)
    .passthrough();

export const draughtProofingMeasures = makeLibrarySchema(
    'draught_proofing_measures',
    measure,
);
