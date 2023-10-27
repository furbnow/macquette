import { z } from 'zod';
import { TypeOf, Visitable, Visitor } from '.';

const zodVisitor: Visitor<z.ZodTypeAny> = {
  string: () => z.string(),
  number: () => z.number(),
  boolean: () => z.boolean(),
  array: (elem) => z.array(elem),
  struct: (shape) => z.object(shape),
  enum: (values) => {
    if (values.length === 0) {
      throw new Error('Enum values must have at least one item');
    }
    // SAFETY: Checked above
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return z.enum(values as readonly [string, ...string[]]);
  },
  literal: (value) => z.literal(value),
  discriminatedUnion: (field, shapes) => {
    const shapesEntries = Object.entries(shapes);
    if (shapesEntries.length < 2) {
      throw new Error('Must provide at least 2 discriminated union bodies');
    }
    const zodTypes = shapesEntries.map(([discriminatorValue, shape]) =>
      z
        .object({
          [field]: z.literal(discriminatorValue),
        })
        .extend(shape),
    );
    // SAFETY: By tests
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
    return z.discriminatedUnion(field, zodTypes as any);
  },
  nullable: (inner) => z.nullable(inner),
};

type ZodTypeOf<T extends Visitable> = z.Schema<TypeOf<T>>;

export function makeZodSchema<T extends Visitable>(spec: T) {
  // SAFETY: By tests
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return spec.visit(zodVisitor) as ZodTypeOf<T>;
}
