// SAFETY: By tests
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { mapValues } from 'lodash';
import {
    Primitive,
    TypeOf,
    Visitable,
    Visitor,
    _Array,
    _Boolean,
    _DiscriminatedUnion,
    _Enum,
    _Literal,
    _Nullable,
    _Number,
    _String,
    _Struct,
} from '.';
import { ReadonlyNonEmptyArray } from '../../helpers/non-empty-array';
import { TupleUnion } from '../../helpers/tuple-union';

function id<T>(val: T): T {
    return val;
}

const fromFormStateVisitor: Visitor<(formState: any) => any> = {
    string:
        ({ default_ }) =>
        (formState: string | null) =>
            formState ?? default_ ?? '',
    number:
        ({ default_ }) =>
        (formState: number | null) =>
            formState ?? default_ ?? 0,
    boolean:
        ({ default_ }) =>
        (formState: boolean | null) =>
            formState ?? default_ ?? false,
    array: (innerFromFormState) => (formState: Array<any>) =>
        formState.map(innerFromFormState),
    struct:
        (shape: Record<string, (formState: any) => any>) =>
        (formState: Record<string, any>) =>
            mapValues(shape, (innerFromFormState, key) =>
                innerFromFormState(formState[key]),
            ),
    enum:
        (values: ReadonlyNonEmptyArray<string>, { default_ }) =>
        (formState: string | null) =>
            formState ?? default_ ?? values[0],
    literal: (value: Primitive) => () => value,
    discriminatedUnion:
        (
            field: string,
            spec: Record<string, Record<string, (formState: any) => any>>,
            { default_ },
        ) =>
        (formState: {
            selected: string | null;
            variants: Record<string, Record<string, any>>;
        }) => {
            const selected =
                formState.selected ?? (default_ as string) ?? Object.keys(spec)[0]!;
            const variantSpec = spec[selected]!;
            const variantFormState = formState.variants[selected]!;
            const variantValue = mapValues(variantSpec, (innerFromFormState, key) =>
                innerFromFormState(variantFormState[key]),
            );
            return { [field]: selected, ...variantValue };
        },
    nullable:
        (innerFromFormState) =>
        ({ isNull, value }: { isNull: boolean; value: any }) =>
            isNull ? null : innerFromFormState(value),
};

const toFormStateVisitor: Visitor<(value: any) => any> = {
    string: () => id,
    number: () => id,
    boolean: () => id,
    array:
        (innerToFormState) =>
        (value: null | Array<any>): Array<any> =>
            (value ?? []).map(innerToFormState),
    struct:
        (shape: Record<string, (value: any) => any>) =>
        (value: null | Record<string, any>) =>
            mapValues(shape, (innerToFormState, key) =>
                innerToFormState(value === null ? null : value[key]),
            ),
    enum: () => id,
    literal: () => id,
    discriminatedUnion:
        (field: string, spec: Record<string, Record<string, (value: any) => any>>) =>
        (value: null | Record<string, any>) => ({
            selected: value !== null ? value[field] : null,
            variants: mapValues(spec, (variantShape, fieldValue) =>
                mapValues(variantShape, (innerToFormState, variantKey) =>
                    innerToFormState(
                        value !== null && fieldValue === value[field]
                            ? value[variantKey]
                            : null,
                    ),
                ),
            ),
        }),
    nullable: (innerToFormState) => (value) => ({
        isNull: value === null,
        value: innerToFormState(value),
    }),
};

export type FormStateOf<T extends Visitable> = T extends _String
    ? string | null
    : T extends _Number
    ? number | null
    : T extends _Boolean
    ? boolean | null
    : T extends _Array<infer Inner>
    ? Array<FormStateOf<Inner>>
    : T extends _Struct<infer Shape>
    ? { [K in keyof Shape]: FormStateOf<Shape[K]> }
    : T extends _Enum<infer Values extends ReadonlyNonEmptyArray<string>>
    ? TupleUnion<Values> | null
    : T extends _Literal<infer Value>
    ? Value
    : T extends _DiscriminatedUnion<string, infer Spec>
    ? {
          selected: keyof Spec | null;
          variants: {
              [ShapeKey in keyof Spec]: {
                  [FieldKey in keyof Spec[ShapeKey]]: FormStateOf<
                      Spec[ShapeKey][FieldKey]
                  >;
              };
          };
      }
    : T extends _Nullable<infer Inner>
    ? { isNull: boolean; value: FormStateOf<Inner> }
    : never;

export function makeFormStateTransforms<T extends Visitable>(spec: T) {
    return {
        fromFormState: spec.visit(fromFormStateVisitor) as (
            _: FormStateOf<T>,
        ) => TypeOf<T>,
        toFormState: spec.visit(toFormStateVisitor) as (_: TypeOf<T>) => FormStateOf<T>,
    };
}
