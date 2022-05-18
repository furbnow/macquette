import { z } from 'zod';

import { dateSchema, assessmentMetadataSchema } from './api-metadata';
import { scenarioSchema } from './scenario';

export const projectDataSchema = z.record(scenarioSchema);
export const projectSchema = assessmentMetadataSchema
    .omit({ updatedAt: true, createdAt: true })
    .extend({
        created_at: dateSchema,
        updated_at: dateSchema,
        data: projectDataSchema,
    });

export type Project = z.infer<typeof projectSchema>;
