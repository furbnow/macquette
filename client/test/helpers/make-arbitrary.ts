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

const arbVisitor: Visitor<fc.Arbitrary<any>> = {
  string: () => fc.string(),
  number: (ctx) => {
    const constraints: fc.FloatConstraints & fc.IntegerConstraints = {};
    if (typeof ctx['min'] === 'number') {
      constraints.min = ctx['min'];
    }
    if (typeof ctx['max'] === 'number') {
      constraints.max = ctx['max'];
    }
    if (ctx['integer'] === true) {
      return fc.integer(constraints);
    } else {
      return fc
        .float({ noNaN: true, noDefaultInfinity: true, ...constraints })
        .filter(
          (value) =>
            value === 0 ||
            (Math.abs(value) > Math.pow(2, -7) && Math.abs(value) < Math.pow(2, 13)),
        );
    }
  },
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
  arrayWithIds: (_idField: string, shape: Record<string, fc.Arbitrary<any>>) =>
    fc.array(fc.record(shape)),
  union: (inners) => fc.oneof(...inners),
  tuple: (inners) => fc.tuple(...inners),
};

export function makeArbitrary<T extends Visitable>(spec: T) {
  return spec.visit(arbVisitor) as fc.Arbitrary<TypeOf<T>>;
}
