import { z } from 'zod';

import { assessmentMetadataSchema } from './api-metadata';
import { dateSchema } from './helpers/date';
import { imageSchema } from './image';
import { scenarioSchema } from './scenario';

export const projectDataSchema = z.record(scenarioSchema);
export const projectSchema = assessmentMetadataSchema
    .omit({ updatedAt: true, createdAt: true })
    .extend({
        created_at: dateSchema,
        updated_at: dateSchema,
        data: projectDataSchema,
        images: z.array(imageSchema),
    });

export type Project = z.output<typeof projectSchema>;
