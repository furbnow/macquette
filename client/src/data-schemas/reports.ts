import { z } from 'zod';
import { dateSchema } from './helpers/date';

export const reportSchema = z.object({
  id: z.string(),
  createdAt: dateSchema,
  report: z.string(),
});
export type Report = z.infer<typeof reportSchema>;
