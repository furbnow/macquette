import { z } from 'zod';

import { assessmentMetadataSchema } from './api-metadata';
import { dateSchema } from './helpers/date';
import { imageSchema } from './image';
import { scenarioSchema } from './scenario';

export const userAccessSchema = z.array(
    z.object({
        roles: z.array(z.enum(['owner', 'org_admin', 'editor'])),
        id: z.string(),
        name: z.string(),
        email: z.string(),
    }),
);
export type UserAccess = z.output<typeof userAccessSchema>;

export const projectDataSchema = z.record(scenarioSchema);
export const projectSchema = assessmentMetadataSchema
    .omit({ updatedAt: true, createdAt: true, owner: true })
    .extend({
        created_at: dateSchema,
        updated_at: dateSchema,
        data: projectDataSchema,
        images: z.array(imageSchema),
        access: userAccessSchema,
        permissions: z.object({
            can_share: z.boolean(),
            can_reassign: z
                .boolean()
                .optional()
                .transform((val) => val ?? false),
        }),
    });

export type Project = z.output<typeof projectSchema>;
