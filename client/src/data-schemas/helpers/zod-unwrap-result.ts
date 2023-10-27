import { z } from 'zod';

import { Result } from '../../helpers/result';

/** Extract a value of `OutputT` from a Zod schema returning `Result<OutputT, string>` */
export function zodUnwrapResult<Output, Input>(
  zodType: z.ZodType<Result<Output, string>, z.ZodTypeDef, Input>,
): z.ZodType<Output, z.ZodTypeDef, Input> {
  return zodType
    .refine(
      (result) => result.isOk(),
      (result) => ({ message: result.unwrapErr() }),
    )
    .transform((result) => result.unwrap());
}
