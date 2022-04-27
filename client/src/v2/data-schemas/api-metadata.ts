import { z } from 'zod';

const dateSchema = z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) {
        return new Date(arg);
    } else {
        return arg;
    }
}, z.date());

const statusSchema = z.enum(['Complete', 'In progress', 'Test']);

const userSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
});

const organisationMetaSchema = z.object({
    id: z.string(),
    name: z.string(),
});

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

export const libraryCommonMetadataSchema = z.object({
    id: z.string(),
    name: z.string(),
    created_at: dateSchema,
    updated_at: dateSchema,
    permissions: z.object({ can_write: z.boolean(), can_share: z.boolean() }),
    owner: z.discriminatedUnion('type', [
        z.object({ type: z.literal('global'), id: z.literal(null), name: z.string() }),
        z.object({ type: z.literal('personal') }).merge(userSchema),
        z.object({ type: z.literal('organisation') }).merge(organisationMetaSchema),
    ]),
});
