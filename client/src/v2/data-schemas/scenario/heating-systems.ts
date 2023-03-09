import { z } from 'zod';

import { legacyBoolean, stringyFloatSchema } from './value-schemas';

export const heatingSystems = z.array(
    z
        .object({
            provides: z.enum(['water', 'heating_and_water', 'heating']),
            fraction_water_heating: z.number(),
            instantaneous_water_heating: legacyBoolean,
            primary_circuit_loss: z.enum(['Yes', 'No']),
            combi_loss: z.union([
                z.literal(0),
                z.enum([
                    '0',
                    'Instantaneous, without keep hot-facility',
                    'Instantaneous, with keep-hot facility controlled by time clock',
                    'Instantaneous, with keep-hot facility not controlled by time clock',
                    'Storage combi boiler >= 55 litres',
                    'Storage combi boiler < 55 litres',
                    // Buggy value that occurs in very old assessments due to an HTML
                    // sanitisation bug in the old PHP backend.
                    'Storage combi boiler  55 litres',
                ]),
            ]),
            category: z.enum([
                'Combi boilers',
                'System boilers',
                'Heat pumps',
                'Room heaters',
                'Warm air systems',
                'Hot water only',
            ]),
            sfp: z.union([z.literal('undefined'), stringyFloatSchema]),
        })
        .partial()
        .extend({ fuel: z.string() }),
);
