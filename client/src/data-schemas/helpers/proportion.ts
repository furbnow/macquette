import { z } from 'zod';

import { Proportion } from '../../helpers/proportion';
import { zodUnwrapResult } from './zod-unwrap-result';

export const proportionSchema = z.union([
  zodUnwrapResult(z.number().transform((ratio) => Proportion.fromRatio(ratio))),
  z
    .unknown()
    .refine(
      (p): p is Proportion => p instanceof Proportion,
      'input was not an instance of Proportion',
    ),
]);
