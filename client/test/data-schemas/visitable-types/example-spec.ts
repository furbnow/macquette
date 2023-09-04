import { omit } from 'lodash';
import { t } from '../../../src/data-schemas/visitable-types';

const exampleSpecStruct = {
  aString: t.string(),
  aNumber: t.number(),
  aBoolean: t.boolean(),
  anArray: t.array(t.number()),
  aStruct: t.struct({
    nested: t.literal('nest' as const),
  }),
  anEnum: t.enum(['one', 'two', 'three']),
  aLiteral: t.literal('lorem' as const),
  aDiscriminatedUnion: t.discriminatedUnion('type', [
    t.struct({
      type: t.literal('type 1'),
      foo: t.number(),
    }),
    t.struct({
      type: t.literal('type 2'),
      foo: t.string(),
      aNestedDiscriminatedUnion: t.discriminatedUnion('flavour', [
        t.struct({ flavour: t.literal('strawberry'), bar: t.boolean() }),
        t.struct({ flavour: t.literal('banana'), baz: t.array(t.boolean()) }),
      ]),
    }),
  ]),
  aNullable: t.nullable(
    t.struct({
      value: t.number(),
    }),
  ),
  aComplexArray: t.array(
    t.struct({
      stairs: t.number(),
      elevators: t.number(),
    }),
  ),
  anArrayWithIds: t.arrayWithIds(
    'id',
    t.struct({
      id: t.string(),
      somethingElse: t.number(),
    }),
  ),
  aUnion: t.union([t.string(), t.number(), t.boolean()]),
  aTuple: t.tuple([t.string(), t.number()]),
};

/** For use in tests of transforms */
export const exampleSpec = t.struct(exampleSpecStruct);

export const exampleSpecWithoutUnion = t.struct(omit(exampleSpecStruct, 'aUnion'));
