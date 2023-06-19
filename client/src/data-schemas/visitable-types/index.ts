import { mapValues } from 'lodash';
import { ReadonlyNonEmptyArray } from '../../helpers/non-empty-array';
import { TupleUnion } from '../../helpers/tuple-union';

export type Primitive = string | number | boolean | bigint | null | undefined;

type Ctx = Record<string | symbol, unknown>;
export type Visitor<T> = {
    string: (context: Ctx) => T;
    number: (context: Ctx) => T;
    boolean: (context: Ctx) => T;
    array: (elemT: T, context: Ctx) => T;
    struct: (shape: Record<string, T>, context: Ctx) => T;
    enum: (values: ReadonlyNonEmptyArray<string>, context: Ctx) => T;
    literal: (value: Primitive, context: Ctx) => T;
    discriminatedUnion: (
        field: string,
        spec: Record<string, Record<string, T>>,
        context: Ctx,
    ) => T;
    nullable: (inner: T, context: Ctx) => T;
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
    constructor(private elemT: I, private context: Ctx = {}) {}
    visit<T>(visitor: Visitor<T>): T {
        return visitor.array(this.elemT.visit(visitor), this.context);
    }
}
export class _Struct<Shape extends Record<string, Visitable>> implements Visitable {
    tag = 'struct' as const;
    constructor(private shape: Shape, private context: Ctx = {}) {}
    visit<T>(visitor: Visitor<T>): T {
        return visitor.struct(
            mapValues(this.shape, (innerValue) => innerValue.visit(visitor)),
            this.context,
        );
    }
}
export class _Enum<Values extends ReadonlyNonEmptyArray<string>> implements Visitable {
    tag = 'enum' as const;
    constructor(private values: Values, private context: Ctx = {}) {}
    visit<T>(visitor: Visitor<T>): T {
        return visitor.enum(this.values, this.context);
    }
}
export class _Literal<Value extends Primitive> implements Visitable {
    tag = 'literal' as const;
    constructor(private value: Value, private context: Ctx = {}) {}
    visit<T>(visitor: Visitor<T>): T {
        return visitor.literal(this.value, this.context);
    }
}
export class _DiscriminatedUnion<
    Field extends string,
    Shapes extends Record<string, Record<string, Visitable>>,
> implements Visitable
{
    tag = 'discriminated union' as const;
    constructor(
        private field: Field,
        private shapes: Shapes,
        private context: Ctx = {},
    ) {}
    visit<T>(visitor: Visitor<T>): T {
        return visitor.discriminatedUnion(
            this.field,
            mapValues(this.shapes, (shape) =>
                mapValues(shape, (field) => field.visit(visitor)),
            ),
            this.context,
        );
    }
}
export class _Nullable<Inner extends Visitable> implements Visitable {
    tag = 'nullable' as const;
    constructor(private inner: Inner, private context: Ctx = {}) {}
    visit<T>(visitor: Visitor<T>): T {
        return visitor.nullable(this.inner.visit(visitor), this.context);
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
    : T extends _Enum<infer Values extends ReadonlyNonEmptyArray<string>>
    ? TupleUnion<Values>
    : T extends _Literal<infer Value>
    ? Value
    : T extends _DiscriminatedUnion<infer Field, infer Spec>
    ? {
          [ShapeKey in keyof Spec]: { [F in Field]: ShapeKey } & {
              [FieldKey in keyof Spec[ShapeKey]]: TypeOf<Spec[ShapeKey][FieldKey]>;
          };
      }[keyof Spec]
    : T extends _Nullable<infer Inner>
    ? null | TypeOf<Inner>
    : never;

// Aliases
export const t = {
    string: (context?: Ctx) => new _String(context),
    number: (context?: Ctx) => new _Number(context),
    boolean: (context?: Ctx) => new _Boolean(context),
    array: <Elem extends Visitable>(elem: Elem, context?: Ctx) =>
        new _Array(elem, context),
    struct: <Shape extends Record<string, Visitable>>(shape: Shape, context?: Ctx) =>
        new _Struct(shape, context),
    enum: <Values extends ReadonlyNonEmptyArray<string>>(values: Values, context?: Ctx) =>
        new _Enum(values, context),
    literal: <Value extends Primitive>(value: Value, context?: Ctx) =>
        new _Literal(value, context),
    discriminatedUnion: <
        Field extends string,
        Shapes extends Record<string, Record<string, Visitable>>,
    >(
        field: Field,
        shapes: Shapes,
        context?: Ctx,
    ) => new _DiscriminatedUnion(field, shapes, context),
    nullable: <Inner extends Visitable>(inner: Inner, context?: Ctx) =>
        new _Nullable(inner, context),
};
