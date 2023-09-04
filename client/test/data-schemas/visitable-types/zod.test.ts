import { z } from 'zod';
import { makeZodSchema } from '../../../src/data-schemas/visitable-types/zod';
import { exampleSpec } from './example-spec';

describe('zod visitor example spec', () => {
  const zodSchema = makeZodSchema(exampleSpec);
  // eslint-disable-next-line jest/expect-expect
  test('type test', () => {
    type Expected = z.Schema<{
      aString: string;
      aNumber: number;
      aBoolean: boolean;
      anArray: number[];
      aStruct: { nested: 'nest' };
      anEnum: 'one' | 'two' | 'three';
      aLiteral: 'lorem';
      aDiscriminatedUnion:
        | {
            type: 'type 1';
            foo: number;
          }
        | {
            type: 'type 2';
            foo: string;
            aNestedDiscriminatedUnion:
              | { flavour: 'strawberry'; bar: boolean }
              | { flavour: 'banana'; baz: boolean[] };
          };
      aNullable: null | {
        value: number;
      };
      aComplexArray: Array<{
        stairs: number;
        elevators: number;
      }>;
      anArrayWithIds: Array<{
        id: string;
        somethingElse: number;
      }>;
      aUnion: string | number | boolean;
      aTuple: [string, number];
    }>;
    type Inferred = typeof zodSchema;
    type TestLeft = Expected extends Inferred ? 'success' : never;
    'success' satisfies TestLeft;
    type TestRight = Inferred extends Expected ? 'success' : never;
    'success' satisfies TestRight;
  });

  test('visitor test (good data)', () => {
    const goodData = {
      aString: 'hello world',
      aNumber: 42,
      aBoolean: false,
      anArray: [42, 42, 42],
      aStruct: {
        nested: 'nest',
      },
      anEnum: 'three',
      aLiteral: 'lorem',
      aDiscriminatedUnion: {
        type: 'type 1',
        foo: 42,
      },
      aNullable: null,
      aComplexArray: [{ stairs: 42, elevators: 42 }],
      anArrayWithIds: [
        { id: 'one', somethingElse: 42 },
        { id: 'two', somethingElse: 42 },
      ],
      aUnion: false,
      aTuple: ['', 42],
    } satisfies z.infer<typeof zodSchema>;
    expect(zodSchema.parse(goodData)).toEqual(goodData);
  });

  test('visitor test (bad data)', () => {
    const badData = {
      aString: false,
      aNumber: 'hello world',
      aBoolean: false,
      anArray: [42, 42, 42],
      aStruct: {
        nested: 'nest',
      },
      anEnum: 'three',
      aLiteral: 'lorem',
      aDiscriminatedUnion: {
        type: 'type 1',
        foo: 42,
      },
      aNullable: {
        value: 'hello world',
      },
      aComplexArray: [],
      anArrayWithIds: [],
      aUnion: null,
      aTuple: [],
    };
    expect(() => zodSchema.parse(badData)).toThrow(z.ZodError);
  });
});
