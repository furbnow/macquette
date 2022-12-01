import { z } from 'zod';

export const addressSuggestion = z.object({
    id: z.string(),
    suggestion: z.string(),
});
export type AddressSuggestion = z.output<typeof addressSuggestion>;

export const addressSuggestionResponse = z.object({
    error: z.string().nullable(),
    results: z.array(addressSuggestion),
});
export type AddressSuggestionResponse = z.output<typeof addressSuggestionResponse>;

export const resolvedAddress = z.object({
    id: z.string(),
    address: z.object({
        line1: z.string(),
        line2: z.string(),
        line3: z.string(),
        postTown: z.string(),
        postcode: z.string(),
        country: z.string(),
    }),
    uprn: z.string(),
    localAuthority: z.string(),
    coordinates: z.tuple([z.number(), z.number()]),
    elevation: z.union([z.number(), z.null()]),
    lsoa: z.union([z.string(), z.null()]),
});
export type ResolvedAddress = z.output<typeof resolvedAddress>;

export const resolvedAddressResponse = z.union([
    z.object({
        error: z.string(),
        result: z.null(),
    }),
    z.object({
        error: z.null(),
        result: resolvedAddress,
    }),
]);
export type ResolvedAddressResponse = z.output<typeof resolvedAddressResponse>;
