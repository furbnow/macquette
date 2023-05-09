import { z } from 'zod';
import { dateSchema } from './helpers/date';

const organisationSchema = z.object({
    id: z.string(),
    name: z.string(),
    assessments: z.number(),
    members: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
            lastLogin: z.union([z.literal('never'), dateSchema]),
            isAdmin: z.boolean(),
            isLibrarian: z.boolean(),
        }),
    ),
    permissions: z.object({
        canAddRemoveMembers: z.boolean(),
        canPromoteDemoteLibrarians: z.boolean(),
    }),
});

export const listOrganisationResponse = z.array(organisationSchema);
export type Organisation = z.output<typeof organisationSchema>;
