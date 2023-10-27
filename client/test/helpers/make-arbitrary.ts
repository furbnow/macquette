/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-type-assertions */

import fc from 'fast-check';
import { mapValues } from 'lodash';
import {
  Primitive,
  TypeOf,
  Visitable,
  Visitor,
} from '../../src/data-schemas/visitable-types';
import { ReadonlyNonEmptyArray } from '../../src/helpers/non-empty-array';
import { jsonFloat } from './arbitraries';

const arbVisitor: Visitor<fc.Arbitrary<any>> = {
  string: () => fc.string(),
  number: () => jsonFloat(),
  boolean: () => fc.boolean(),
  array: (elemT: fc.Arbitrary<any>) => fc.array(elemT),
  struct: (shape: Record<string, fc.Arbitrary<any>>) => fc.record(shape),
  enum: (values: ReadonlyNonEmptyArray<string>) => fc.constantFrom(...values),
  literal: (value: Primitive) => fc.constant(value),
  discriminatedUnion: (
    field: string,
    spec: Record<string, Record<string, fc.Arbitrary<any>>>,
  ) => {
    const arbs = Object.values(
      mapValues(spec, (shape, discriminatorValue) =>
        fc.record({
          [field]: fc.constant(discriminatorValue),
          ...shape,
        }),
      ),
    );
    return fc.oneof(...arbs);
  },
  nullable: (inner: fc.Arbitrary<any>) => fc.option(inner),
};

export function makeArbitrary<T extends Visitable>(spec: T) {
  return spec.visit(arbVisitor) as fc.Arbitrary<TypeOf<T>>;
}
