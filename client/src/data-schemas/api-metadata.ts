import { z } from 'zod';

import { dateSchema } from './helpers/date';

export const statusSchema = z.enum(['Complete', 'In progress', 'For review', 'Test']);

export const userSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
});
export type User = z.infer<typeof userSchema>;

export const organisationMetaSchema = z.object({
    id: z.string(),
    name: z.string(),
});
export type Organisation = z.infer<typeof organisationMetaSchema>;

export const assessmentMetadataSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    status: statusSchema,
    createdAt: dateSchema,
    updatedAt: dateSchema,
    owner: userSchema,
    organisation: z.union([z.null(), organisationMetaSchema]),
});

export const createAssessmentSchema = assessmentMetadataSchema;
export const listAssessmentSchema = z.array(assessmentMetadataSchema);
export type AssessmentMetadata = z.infer<typeof assessmentMetadataSchema>;

export const libraryMetadataSchema = z.object({
    id: z.string(),
    created_at: dateSchema,
    updated_at: dateSchema,
    permissions: z.object({ can_write: z.boolean(), can_share: z.boolean() }),
    owner: z.discriminatedUnion('type', [
        z.object({ type: z.literal('global'), id: z.literal(null), name: z.string() }),
        z.object({ type: z.literal('personal') }).merge(userSchema),
        z.object({ type: z.literal('organisation') }).merge(organisationMetaSchema),
    ]),
});
export type LibraryMetadata = z.infer<typeof libraryMetadataSchema>;
