import { z } from 'zod';

const dateSchema = z.preprocess((arg) => {
    if (typeof arg == 'string' || arg instanceof Date) {
        return new Date(arg);
    } else {
        return arg;
    }
}, z.date());

const statusSchema = z.enum(['Complete', 'In progress', 'Test']);

const userSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
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

export const listAssessmentSchema = z.array(assessmentMetadataSchema);
export type AssessmentMetadata = z.infer<typeof listAssessmentSchema>;
