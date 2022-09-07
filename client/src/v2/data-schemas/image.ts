import { z } from 'zod';

export const imageSchema = z.object({
    id: z.number(),
    url: z.string(),
    width: z.number(),
    height: z.number(),
    thumbnail_url: z.string(),
    thumbnail_width: z.number(),
    thumbnail_height: z.number(),
    note: z.string(),
    is_featured: z.boolean(),
});

export type Image = z.output<typeof imageSchema>;
