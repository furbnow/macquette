import { mapValues, omit } from 'lodash';
import { NonEmptyArray } from '../../helpers/non-empty-array';

export type Primitive = string | number | boolean | bigint | null | undefined;

type Ctx = Record<string | symbol, unknown>;
export type Visitor<T> = {
  string: (context: Ctx) => T;
  number: (context: Ctx) => T;
  boolean: (context: Ctx) => T;
  array: (elemT: T, context: Ctx) => T;
  struct: (shape: Record<string, T>, context: Ctx) => T;
  enum: (values: NonEmptyArray<string>, context: Ctx) => T;
  literal: (value: Primitive, context: Ctx) => T;
  discriminatedUnion: (
    field: string,
    spec: Record<string, Record<string, T>>,
    context: Ctx,
  ) => T;
  nullable: (inner: T, context: Ctx) => T;
  arrayWithIds: (field: string, shape: Record<string, T>, context: Ctx) => T;
  union: (inners: T[], context: Ctx) => T;
  tuple: (inners: T[], context: Ctx) => T;
};

export type Visitable<Tag extends string = string> = {
  tag: Tag;
  visit: <T>(visitor: Visitor<T>) => T;
};

export class _String implements Visitable {
  tag = 'string' as const;
  constructor(private context: Ctx = {}) {}
  visit<T>(visitor: Visitor<T>): T {
    return visitor.string(this.context);
  }
}
export class _Number implements Visitable {
  tag = 'number' as const;
  constructor(private context: Ctx = {}) {}
  visit<T>(visitor: Visitor<T>): T {
    return visitor.number(this.context);
  }
}
export class _Boolean implements Visitable {
  tag = 'boolean' as const;
  constructor(private context: Ctx = {}) {}
  visit<T>(visitor: Visitor<T>): T {
    return visitor.boolean(this.context);
  }
}
export class _Array<I extends Visitable> implements Visitable {
  tag = 'array' as const;
  constructor(
    private elemT: I,
    private context: Ctx = {},
  ) {}
  visit<T>(visitor: Visitor<T>): T {
    return visitor.array(this.elemT.visit(visitor), this.context);
  }
}
export class _Struct<Shape extends Record<string, Visitable>> implements Visitable {
  tag = 'struct' as const;
  constructor(
    public shape: Shape,
    private context: Ctx = {},
  ) {}
  visit<T>(visitor: Visitor<T>): T {
    return visitor.struct(
      mapValues(this.shape, (innerValue) => innerValue.visit(visitor)),
      this.context,
    );
  }
}
export class _Enum<Values extends NonEmptyArray<string>> implements Visitable {
  tag = 'enum' as const;
  constructor(
    private values: [...Values],
    private context: Ctx = {},
  ) {}
  visit<T>(visitor: Visitor<T>): T {
    return visitor.enum(this.values, this.context);
  }
}
export class _Literal<Value extends Primitive> implements Visitable {
  tag = 'literal' as const;
  constructor(
    public value: Value,
    private context: Ctx = {},
  ) {}
  visit<T>(visitor: Visitor<T>): T {
    return visitor.literal(this.value, this.context);
  }
}
export class _DiscriminatedUnion<
  Field extends string,
  Inners extends _Struct<Record<Field, _Literal<string>> & Record<string, Visitable>>[],
> implements Visitable
{
  tag = 'discriminated union' as const;
  constructor(
    private field: Field,
    private inners: [...Inners],
    private context: Ctx = {},
  ) {}
  visit<T>(visitor: Visitor<T>): T {
    const shapes = Object.fromEntries(
      this.inners.map(
        (innerStruct) =>
          [
            innerStruct.shape[this.field].value,
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            omit(innerStruct.shape, this.field) as Record<string, Visitable>,
          ] as const,
      ),
    );
    return visitor.discriminatedUnion(
      this.field,
      mapValues(shapes, (shape) => mapValues(shape, (field) => field.visit(visitor))),
      this.context,
    );
  }
}
export class _Nullable<Inner extends Visitable> implements Visitable {
  tag = 'nullable' as const;
  constructor(
    private inner: Inner,
    private context: Ctx = {},
  ) {}
  visit<T>(visitor: Visitor<T>): T {
    return visitor.nullable(this.inner.visit(visitor), this.context);
  }
}
type ArrayIdType = _String | _Number | _Union<[_String, _Number]>;
export class _ArrayWithIds<
  IdField extends string,
  Inner extends _Struct<Record<IdField, ArrayIdType> & Record<string, Visitable>>,
> implements Visitable
{
  tag = 'array with ids' as const;
  constructor(
    private idField: IdField,
    private inner: Inner,
    private context: Ctx = {},
  ) {}
  visit<T>(visitor: Visitor<T>): T {
    return visitor.arrayWithIds(
      this.idField,
      mapValues(this.inner.shape, (v: Visitable) => v.visit<T>(visitor)),
      this.context,
    );
  }
}
export class _Union<Inners extends Visitable[]> implements Visitable {
  tag = 'union' as const;
  constructor(
    private inners: [...Inners],
    private context: Ctx = {},
  ) {}
  visit<T>(visitor: Visitor<T>): T {
    const mappedInners = this.inners.map((v) => v.visit(visitor));
    return visitor.union(mappedInners, this.context);
  }
}
export class _Tuple<Inners extends Visitable[]> implements Visitable {
  tag = 'tuple' as const;
  constructor(
    private inners: [...Inners],
    private context: Ctx = {},
  ) {}
  visit<T>(visitor: Visitor<T>): T {
    const mappedInners = this.inners.map((v) => v.visit(visitor));
    return visitor.tuple(mappedInners, this.context);
  }
}

/** Transforms the visitable type into a normal TypeScript type. This is
 * sometimes useful for writing type transforms.
 */
export type TypeOf<T extends Visitable> = T extends _String
  ? string
  : T extends _Number
  ? number
  : T extends _Boolean
  ? boolean
  : T extends _Array<infer Inner>
  ? Array<TypeOf<Inner>>
  : T extends _Struct<infer Shape>
  ? { [K in keyof Shape]: TypeOf<Shape[K]> }
  : T extends _Enum<infer Values extends NonEmptyArray<string>>
  ? Values[number]
  : T extends _Literal<infer Value>
  ? Value
  : // eslint-disable-next-line @typescript-eslint/no-unused-vars
  T extends _DiscriminatedUnion<infer _Field, infer Inners>
  ? TypeOf<Inners[number]>
  : T extends _Nullable<infer Inner>
  ? null | TypeOf<Inner>
  : // eslint-disable-next-line @typescript-eslint/no-unused-vars
  T extends _ArrayWithIds<infer _IdField, infer Inner>
  ? Array<TypeOf<Inner>>
  : T extends _Union<infer Inners>
  ? TypeOf<Inners[number]>
  : T extends _Tuple<infer Inners>
  ? Inners extends [
      infer FirstInner extends Visitable,
      ...infer RestInners extends Visitable[],
    ]
    ? [TypeOf<FirstInner>, ...TypeOf<_Tuple<RestInners>>]
    : []
  : never;

// Aliases
export const t = {
  string: (context?: Ctx) => new _String(context),
  number: (context?: Ctx) => new _Number(context),
  boolean: (context?: Ctx) => new _Boolean(context),
  array: <Elem extends Visitable>(elem: Elem, context?: Ctx) => new _Array(elem, context),
  struct: <Shape extends Record<string, Visitable>>(shape: Shape, context?: Ctx) =>
    new _Struct(shape, context),
  enum: <Values extends NonEmptyArray<string>>(values: [...Values], context?: Ctx) =>
    new _Enum(values, context),
  literal: <Value extends Primitive>(value: Value, context?: Ctx) =>
    new _Literal(value, context),
  discriminatedUnion: <
    Field extends string,
    Inners extends Array<
      _Struct<Record<Field, _Literal<string>> & Record<string, Visitable>>
    >,
  >(
    field: Field,
    inners: [...Inners],
    context?: Ctx,
  ) => new _DiscriminatedUnion(field, inners, context),
  nullable: <Inner extends Visitable>(inner: Inner, context?: Ctx) =>
    new _Nullable(inner, context),
  arrayWithIds: <
    IdField extends string,
    Inner extends _Struct<Record<IdField, ArrayIdType> & Record<string, Visitable>>,
  >(
    idField: IdField,
    inner: Inner,
    context?: Ctx,
  ) => new _ArrayWithIds<IdField, Inner>(idField, inner, context),
  union: <Inners extends Visitable[]>(inners: [...Inners], context?: Ctx) =>
    new _Union(inners, context),
  tuple: <Inners extends Visitable[]>(inners: [...Inners], context?: Ctx) =>
    new _Tuple(inners, context),
};
