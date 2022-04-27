import { z } from 'zod';

import { stringyFloatSchema } from '../helpers/legacy-numeric-values';
import {
    libraryItemCommonSchema,
    makeLibrarySchema,
    measureCommonSchema,
    withGenericTags,
} from './common';

const item = z
    .object({
        type: z.enum(['Chimney', 'Flueless gas fire', 'Open flue', 'Open Flue']),
        source: z.string(),
        ventilation_rate: stringyFloatSchema,
    })
    .merge(libraryItemCommonSchema)
    .merge(withGenericTags)
    .passthrough();

const measure = item
    .extend({
        type: z.enum(['Measure', 'Open Flue']),
    })
    .merge(measureCommonSchema)
    .passthrough();

export const intentionalVentsAndFlues = makeLibrarySchema(
    'intentional_vents_and_flues',
    item,
);

export const intentionalVentsAndFluesMeasures = makeLibrarySchema(
    'intentional_vents_and_flues_measures',
    measure,
);
