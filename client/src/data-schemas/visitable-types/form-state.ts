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
  _ArrayWithIds,
  _Boolean,
  _DiscriminatedUnion,
  _Enum,
  _Literal,
  _Nullable,
  _Number,
  _String,
  _Struct,
  _Tuple,
  _Union,
} from '.';
import { NonEmptyArray } from '../../helpers/non-empty-array';
import { zip } from '../../helpers/zip';

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
      mapValues(shape, (innerFromFormState, key) => innerFromFormState(formState[key])),
  enum:
    (values: NonEmptyArray<string>, { default_ }) =>
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
  arrayWithIds:
    (idField, shape: Record<string, (formState: any) => any>) =>
    (formState: Array<Record<string, any>>) =>
      formState.map((item) => ({
        [idField]: item[idField],
        ...mapValues(shape, (innerFromFormState, key) => innerFromFormState(item[key])),
      })),
  union: () => {
    // We have no way of knowing which union variant is applicable
    throw new Error('Unions are not supported in form state types');
  },
  tuple: (innerFromFormStates) => (formState: unknown[]) =>
    zip(innerFromFormStates, formState).map(([innerFromFormState, formState]) =>
      innerFromFormState(formState),
    ),
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
    (shape: Record<string, (value: any) => any>) => (value: null | Record<string, any>) =>
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
            value !== null && fieldValue === value[field] ? value[variantKey] : null,
          ),
        ),
      ),
    }),
  nullable: (innerToFormState) => (value) => ({
    isNull: value === null,
    value: innerToFormState(value),
  }),
  arrayWithIds:
    (idField: string, shape: Record<string, (value: any) => any>) =>
    (value: Array<Record<string, any>>) =>
      value.map((item) => ({
        [idField]: item[idField],
        ...mapValues(shape, (innerToFormState, key) => innerToFormState(item[key])),
      })),
  union: () => {
    // We have no way of knowing which union variant is applicable
    throw new Error('Unions are not supported in form state types');
  },
  tuple: (innerToFormStates) => (values: unknown[]) =>
    zip(innerToFormStates, values).map(([innerToFormState, value]) =>
      innerToFormState(value),
    ),
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
  : T extends _Enum<infer Values>
  ? Values[number] | null
  : T extends _Literal<infer Value>
  ? Value
  : T extends _DiscriminatedUnion<infer Field, infer Inners extends [...any[]]>
  ? {
      selected: Inners[number]['shape'][Field]['value'] | null;
      variants: {
        [ShapeKey in Inners[number]['shape'][Field]['value']]: {
          [FieldKey in keyof Omit<
            Extract<Inners[number]['shape'], Record<Field, _Literal<ShapeKey>>>,
            Field
          >]: FormStateOf<
            Extract<Inners[number]['shape'], Record<Field, _Literal<ShapeKey>>>[FieldKey]
          >;
        };
      };
    }
  : T extends _Nullable<infer Inner>
  ? { isNull: boolean; value: FormStateOf<Inner> }
  : T extends _ArrayWithIds<infer IdField extends string, infer Inner>
  ? Array<
      FormStateOf<Inner> & {
        [K in IdField]: TypeOf<Inner['shape'][IdField]>;
      }
    >
  : T extends _Union<infer Inners>
  ? FormStateOf<Inners[number]>
  : T extends _Tuple<infer Inners>
  ? Inners extends [
      infer FirstInner extends Visitable,
      ...infer RestInners extends Visitable[],
    ]
    ? [FormStateOf<FirstInner>, ...FormStateOf<_Tuple<RestInners>>]
    : []
  : never;

export function makeFormStateTransforms<T extends Visitable>(spec: T) {
  return {
    fromFormState: spec.visit(fromFormStateVisitor) as (_: FormStateOf<T>) => TypeOf<T>,
    toFormState: spec.visit(toFormStateVisitor) as (_: TypeOf<T>) => FormStateOf<T>,
  };
}
