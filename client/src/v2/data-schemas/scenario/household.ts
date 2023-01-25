import { z } from 'zod';

import { withOriginSchema } from '../helpers/with-origin';
import { legacyString } from './value-schemas';

const addressSchema = z.object({
    line1: z.string(),
    line2: z.string(),
    line3: z.string(),
    postTown: z.string(),
    postcode: z.string(),
    country: z.string(),
});

export const householdSchema = z.object({
    looked_up: z.boolean(),
    uniquePropertyReferenceNumber: withOriginSchema(z.string(), z.never()),
    address_1: legacyString,
    address_2: legacyString,
    address_3: legacyString,
    address_town: legacyString,
    address_postcode: legacyString,
    address_country: z.string(),
    address_full: withOriginSchema(addressSchema, z.never()),
    address_la: legacyString,
    address_la_full: withOriginSchema(z.string(), z.never()),
    address_lsoa: legacyString,
    address_lsoa_full: withOriginSchema(z.string(), z.never()),
    local_planning_authority: z.string(),
    location_density: z.enum(['urban', 'suburban', 'rural']),
    exposure: z.enum(['very severe', 'severe', 'moderate', 'sheltered']),
    flooding_rivers_sea: z.enum(['HIGH', 'MED', 'LOW', 'VLOW', '']),
    flooding_surface_water: z.enum(['HIGH', 'MED', 'LOW', 'VLOW', '']),
    flooding_reservoirs: z.enum(['WITHIN', 'OUTWITH', '']),
    radon_risk: z
        .union([z.enum(['LOW', '1-3', '3-5', '5-10', '10-30', '30']), z.literal(30)])
        .transform((val) => (val === 30 ? ('30' as const) : val)),
});
