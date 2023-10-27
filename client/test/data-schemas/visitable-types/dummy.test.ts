// This is a test suite for the dummy transform. It serves as an example of how
// to write a test suite for a transform.

import { makeDummyValue } from './dummy-transform';
import { exampleSpec } from './example-spec';

describe('dummy visitor example spec', () => {
  const dummyValue = makeDummyValue(exampleSpec);

  // eslint-disable-next-line jest/expect-expect
  test('type test', () => {
    type Expected = {
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
    };
    type Inferred = typeof dummyValue;
    type TestLeft = Expected extends Inferred ? 'success' : never;
    'success' satisfies TestLeft;
    type TestRight = Inferred extends Expected ? 'success' : never;
    'success' satisfies TestRight;
  });

  test('visitor test', () => {
    expect(dummyValue).toEqual({
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
    } satisfies typeof dummyValue);
  });
});
