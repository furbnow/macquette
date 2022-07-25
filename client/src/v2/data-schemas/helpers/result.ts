import { z } from 'zod';

import { isIndexable } from '../../helpers/is-indexable';
import { Result } from '../../helpers/result';

type Input<OkIn, ErrIn> =
    | { type: 'result/ok'; value: OkIn }
    | { type: 'result/err'; value: ErrIn }
    | Result<OkIn, ErrIn>;
type SchemaType<OkIn, OkOut, ErrIn, ErrOut> = z.ZodType<
    Result<OkOut, ErrOut>,
    z.ZodTypeDef,
    Input<OkIn, ErrIn>
>;
export function resultSchema<OkIn, OkOut, ErrIn, ErrOut>(
    okSchema: z.ZodType<OkOut, z.ZodTypeDef, OkIn>,
    errSchema: z.ZodType<ErrOut, z.ZodTypeDef, ErrIn>,
): SchemaType<OkIn, OkOut, ErrIn, ErrOut> {
    // SAFETY: Zod's type inference is a mess here. It makes the result partial
    // for some reason (using its `addQuestionMarks` type helper). Maybe this
    // will be fixed in a future version. For now we use some judicious casts.
    const jsonSchema = z
        .discriminatedUnion('type', [
            z.object({ type: z.literal('result/ok'), value: okSchema }),
            z.object({ type: z.literal('result/err'), value: errSchema }),
        ])
        .transform(
            (union_: {
                type: 'result/ok' | 'result/err';
                value?: OkOut | ErrOut;
            }): Result<OkOut, ErrOut> => {
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                const union = union_ as
                    | { type: 'result/ok'; value: OkOut }
                    | { type: 'result/err'; value: ErrOut };
                switch (union.type) {
                    case 'result/ok':
                        return Result.ok(union.value);
                    case 'result/err':
                        return Result.err(union.value);
                }
            },
        );
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return z.preprocess((arg): unknown => {
        if (isIndexable(arg) && typeof arg['toJSON'] === 'function') {
            return arg['toJSON']();
        } else {
            return arg;
        }
    }, jsonSchema) as unknown as SchemaType<OkIn, OkOut, ErrIn, ErrOut>;
}
