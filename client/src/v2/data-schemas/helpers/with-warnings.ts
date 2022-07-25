import { z } from 'zod';

import { isIndexable } from '../../helpers/is-indexable';
import { WithWarnings } from '../../helpers/with-warnings';

type Input<ValueIn, WarningIn> =
    | {
          type: 'with warnings';
          value: ValueIn;
          warnings: WarningIn[];
      }
    | WithWarnings<ValueIn, WarningIn>;
type Schema<ValueIn, ValueOut, WarningIn, WarningOut> = z.ZodType<
    WithWarnings<ValueOut, WarningOut>,
    z.ZodTypeDef,
    Input<ValueIn, WarningIn>
>;

export function withWarningsSchema<ValueIn, ValueOut, WarningIn, WarningOut>(
    valueSchema: z.ZodType<ValueOut, z.ZodTypeDef, ValueIn>,
    warningSchema: z.ZodType<WarningOut, z.ZodTypeDef, WarningIn>,
): Schema<ValueIn, ValueOut, WarningIn, WarningOut> {
    // SAFETY: Zod's type inference is a mess here. It makes the result partial
    // for some reason (using its `addQuestionMarks` type helper). Maybe this
    // will be fixed in a future version. For now we use some judicious casts.
    const jsonSchema = z
        .object({
            type: z.literal('with warnings'),
            value: valueSchema,
            warnings: z.array(warningSchema),
        })
        .transform(
            (jsonRepr_: {
                type: 'with warnings';
                value?: ValueOut;
                warnings?: WarningOut[];
            }) => {
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                const jsonRepr = jsonRepr_ as {
                    type: 'with warnings';
                    value: ValueOut;
                    warnings: WarningOut[];
                };
                return new WithWarnings(jsonRepr.value, new Set(jsonRepr.warnings));
            },
        );
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return z.preprocess((arg): unknown => {
        if (isIndexable(arg) && typeof arg['toJSON'] === 'function') {
            return arg['toJSON']();
        } else {
            return arg;
        }
    }, jsonSchema) as unknown as Schema<ValueIn, ValueOut, WarningIn, WarningOut>;
}
