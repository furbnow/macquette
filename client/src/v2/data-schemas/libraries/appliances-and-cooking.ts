import { z } from 'zod';

import { stringyFloatSchema } from '../scenario/value-schemas';
import { libraryItemCommonSchema, makeLibrarySchema, withGenericTags } from './common';

const item = z
    .object({
        units: z.string(),
        category: z.enum([
            'Computing',
            'Cooking',
            'Food storage',
            'Laundry',
            'Miscelanea',
            'Other kitchen / cleaning',
            'TV',
        ]),
        frequency: stringyFloatSchema,
        efficiency: stringyFloatSchema,
        norm_demand: stringyFloatSchema,
        type_of_fuel: z.enum(['Electricity', 'Gas', 'Oil', 'Solid fuel']),
        reference_quantity: stringyFloatSchema,
        utilisation_factor: stringyFloatSchema,
    })
    .merge(libraryItemCommonSchema)
    .merge(withGenericTags)
    .passthrough();

export const appliancesAndCooking = makeLibrarySchema('appliances_and_cooking', item);
