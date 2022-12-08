import { z } from 'zod';

import { withOriginSchema } from '../helpers/with-origin';

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
    address_1: z.string(),
    address_2: z.string(),
    address_3: z.string(),
    address_town: z.string(),
    address_postcode: z.string(),
    address_country: z.string(),
    address_full: withOriginSchema(addressSchema, z.never()),
    address_la: z.string(),
    address_la_full: withOriginSchema(z.string(), z.never()),
    address_lsoa: z.string(),
    address_lsoa_full: withOriginSchema(z.string(), z.never()),
    local_planning_authority: z.string(),
    location_density: z.enum(['urban', 'suburban', 'rural']),
    exposure: z.enum(['very severe', 'severe', 'moderate', 'sheltered']),
    flooding_rivers_sea: z.enum(['HIGH', 'MED', 'LOW', 'VLOW']),
    flooding_surface_water: z.enum(['HIGH', 'MED', 'LOW', 'VLOW']),
    flooding_reservoirs: z.enum(['WITHIN', 'OUTWITH']),
    radon_risk: z
        .union([z.enum(['LOW', '1-3', '3-5', '5-10', '10-30', '30']), z.literal(30)])
        .transform((val) => (val === 30 ? ('30' as const) : val)),
});
