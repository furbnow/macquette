import { z } from 'zod';

import { legacyBoolean, stringyFloatSchema } from './value-schemas';

export const applianceCarbonCoop = z.object({
    list: z.array(
        z.object({
            number_used: stringyFloatSchema,
            a_plus_rated: legacyBoolean.optional(),
            norm_demand: stringyFloatSchema,
            utilisation_factor: stringyFloatSchema,
            reference_quantity: stringyFloatSchema,
            frequency: stringyFloatSchema,
            type_of_fuel: z.enum(['Electricity', 'Gas', 'Oil']),
            fuel: z.string(),
            category: z.string(),
            efficiency: stringyFloatSchema,
        }),
    ),
});
