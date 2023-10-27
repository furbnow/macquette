import { z } from 'zod';

import { isNonEmpty } from '../../helpers/non-empty-array';

export function zodNonEmptyArray<Inner extends z.ZodType<unknown, z.ZodTypeDef, unknown>>(
  inner: Inner,
) {
  return z.array(inner).refine(isNonEmpty, 'array was empty');
}
