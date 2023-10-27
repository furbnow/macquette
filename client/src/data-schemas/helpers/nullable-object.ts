import { mapValues } from 'lodash';
import { z } from 'zod';

type ZodNullableShape<T extends z.ZodRawShape> = {
  [K in keyof T]: T[K] extends z.ZodObject<z.ZodRawShape> ? T[K] : z.ZodNullable<T[K]>;
};
export function zodNullableObject<T extends z.ZodRawShape>(shape: T) {
  /* eslint-disable
        @typescript-eslint/no-explicit-any,
        @typescript-eslint/no-unsafe-assignment,
        @typescript-eslint/consistent-type-assertions,
    */
  const nullableShape: ZodNullableShape<T> = mapValues(shape, (val) => {
    if (val instanceof z.ZodObject) {
      return val;
    } else {
      return val.nullable();
    }
  }) as any;
  /* eslint-enable */
  return z.object(nullableShape);
}
