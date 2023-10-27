import {
  addIssueToContext,
  INVALID,
  ParseInput,
  ParseReturnType,
  ZodIssueCode,
  ZodType,
  ZodTypeAny,
  ZodTypeDef,
} from 'zod';

type ZodPredicateUnionOption = {
  name?: string;
  predicate: (val: unknown) => boolean;
  schema: ZodTypeAny;
};
type ZodPredicateUnionOptions = Readonly<
  [ZodPredicateUnionOption, ...ZodPredicateUnionOption[]]
>;

export interface ZodPredicateUnionDef<
  T extends ZodPredicateUnionOptions = ZodPredicateUnionOptions,
> extends ZodTypeDef {
  options: T;
  typeName: 'ZodPredicateUnion';
}

export class ZodPredicateUnion<T extends ZodPredicateUnionOptions> extends ZodType<
  T[number]['schema']['_output'],
  ZodPredicateUnionDef,
  T[number]['schema']['_input']
> {
  _parse(input: ParseInput): ParseReturnType<this['_output']> {
    const { ctx } = this._processInputParams(input);

    const option = this.options.find(({ predicate }) => predicate(ctx.data));

    if (option === undefined) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.custom,
        message: `Invalid predicate union. No predicate matched; predicate names ${this.options
          .map(({ name }) => (name === undefined ? '<anonymous>' : `'${name}'`))
          .join(' | ')}`,
      });
      return INVALID;
    }

    const data: unknown = ctx.data;
    if (ctx.common.async) {
      return option.schema._parseAsync({
        data,
        path: ctx.path,
        parent: ctx,
      });
    } else {
      return option.schema._parseSync({
        data,
        path: ctx.path,
        parent: ctx,
      });
    }
  }

  get options() {
    return this._def.options;
  }

  static create<T extends ZodPredicateUnionOptions>(types: T): ZodPredicateUnion<T> {
    return new ZodPredicateUnion<T>({
      typeName: 'ZodPredicateUnion',
      options: types,
    });
  }
}

/** A Zod union which uses a predicate to determine which branch to follow.
 * Faster than ZodUnion, but slower than ZodDiscriminatedUnion. */
export function zodPredicateUnion<T extends ZodPredicateUnionOptions>(types: T) {
  return ZodPredicateUnion.create(types);
}
