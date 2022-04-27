import { z } from 'zod';

import { stringyIntegerSchema } from '../helpers/legacy-numeric-values';
import {
    libraryItemCommonSchema,
    measureCommonSchema,
    makeLibrarySchema,
    withGenericTags,
} from './common';

const measure = z
    .object({
        source: z.string(),
        control_type: stringyIntegerSchema,
    })
    .merge(libraryItemCommonSchema)
    .merge(measureCommonSchema)
    .merge(withGenericTags)
    .passthrough();

export const spaceHeatingControlTypeMeasures = makeLibrarySchema(
    'space_heating_control_type',
    measure,
);
