import { z } from 'zod';

import { stringyIntegerSchema } from '../scenario/value-schemas';
import {
    libraryItemCommonSchema,
    makeLibrarySchema,
    measureCommonSchema,
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
