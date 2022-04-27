import { z } from 'zod';

import { stringyBoolean } from '../helpers/legacy-booleans';
import { stringyFloatSchema } from '../helpers/legacy-numeric-values';
import {
    libraryItemCommonSchema,
    makeLibrarySchema,
    measureCommonSchema,
    withGenericTags,
} from './common';

const item = z
    .object({
        source: z.string(),
        category: z.enum(['Cylinders with inmersion', 'Indirectly heated cylinders']),
        loss_factor_b: stringyFloatSchema,
        storage_volume: stringyFloatSchema,
        volume_factor_b: stringyFloatSchema,
        temperature_factor_b: stringyFloatSchema,
        manufacturer_loss_factor: stringyBoolean,
    })
    .merge(libraryItemCommonSchema)
    .merge(withGenericTags)
    .passthrough();

const measure = item.merge(measureCommonSchema).passthrough();

export const storageType = makeLibrarySchema('storage_type', item);

export const storageTypeMeasures = makeLibrarySchema('storage_type_measures', measure);
