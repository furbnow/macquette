import { t, TypeOf } from '../../../src/data-schemas/visitable-types';
import {
  FormStateOf,
  makeFormStateTransforms,
} from '../../../src/data-schemas/visitable-types/form-state';
import { exampleSpecWithoutUnion } from './example-spec';

describe('form state', () => {
  const { fromFormState, toFormState } = makeFormStateTransforms(exampleSpecWithoutUnion);

  // eslint-disable-next-line jest/expect-expect
  test('type test', () => {
    type Inferred = FormStateOf<typeof exampleSpecWithoutUnion>;
    type Expected = {
      aString: string | null;
      aNumber: number | null;
      aBoolean: boolean | null;
      anArray: Array<number | null>;
      aStruct: { nested: 'nest' };
      anEnum: 'one' | 'two' | 'three' | null;
      aLiteral: 'lorem';
      aDiscriminatedUnion: {
        selected: 'type 1' | 'type 2' | null;
        variants: {
          'type 1': { foo: number | null };
          'type 2': {
            foo: string | null;
            aNestedDiscriminatedUnion: {
              selected: 'strawberry' | 'banana' | null;
              variants: {
                strawberry: { bar: boolean | null };
                banana: { baz: Array<boolean | null> };
              };
            };
          };
        };
      };
      aNullable: { isNull: boolean; value: { value: number | null } };
      aComplexArray: Array<{ stairs: number | null; elevators: number | null }>;
      anArrayWithIds: Array<{ id: string; somethingElse: number | null }>;
      aTuple: [string | null, number | null];
    };

    type TestLeft = Expected extends Inferred ? 'success' : never;
    'success' satisfies TestLeft;
    type TestRight = Inferred extends Expected ? 'success' : never;
    'success' satisfies TestRight;
  });

  test('to form state', () => {
    const value: TypeOf<typeof exampleSpecWithoutUnion> = {
      aString: '',
      aNumber: 0,
      aBoolean: false,
      anArray: [],
      aStruct: { nested: 'nest' },
      anEnum: 'one',
      aLiteral: 'lorem',
      aDiscriminatedUnion: {
        type: 'type 1',
        foo: 42,
      },
      aNullable: null,
      aComplexArray: [],
      anArrayWithIds: [{ id: 'thirty', somethingElse: 42 }],
      aTuple: ['', 0],
    };
    const observed = toFormState(value);
    const expected: FormStateOf<typeof exampleSpecWithoutUnion> = {
      aString: '',
      aNumber: 0,
      aBoolean: false,
      anArray: [],
      aStruct: { nested: 'nest' },
      anEnum: 'one',
      aLiteral: 'lorem',
      aDiscriminatedUnion: {
        selected: 'type 1',
        variants: {
          'type 1': { foo: 42 },
          'type 2': {
            foo: null,
            aNestedDiscriminatedUnion: {
              selected: null,
              variants: {
                strawberry: { bar: null },
                banana: { baz: [] },
              },
            },
          },
        },
      },
      aNullable: {
        isNull: true,
        value: { value: null },
      },
      aComplexArray: [],
      anArrayWithIds: [{ id: 'thirty', somethingElse: 42 }],
      aTuple: ['', 0],
    };
    expect(observed).toEqual(expected);
  });

  test('from form state (nulls)', () => {
    const formState: FormStateOf<typeof exampleSpecWithoutUnion> = {
      aString: null,
      aNumber: null,
      aBoolean: null,
      anArray: [],
      aStruct: { nested: 'nest' },
      anEnum: null,
      aLiteral: 'lorem',
      aDiscriminatedUnion: {
        selected: null,
        variants: {
          'type 1': { foo: null },
          'type 2': {
            foo: null,
            aNestedDiscriminatedUnion: {
              selected: null,
              variants: {
                strawberry: { bar: null },
                banana: { baz: [] },
              },
            },
          },
        },
      },
      aNullable: {
        isNull: false,
        value: { value: null },
      },
      aComplexArray: [{ stairs: null, elevators: null }],
      anArrayWithIds: [{ id: 'one', somethingElse: null }],
      aTuple: [null, null],
    };
    const observed = fromFormState(formState);
    const expected: TypeOf<typeof exampleSpecWithoutUnion> = {
      aString: '',
      aNumber: 0,
      aBoolean: false,
      anArray: [],
      aStruct: { nested: 'nest' },
      anEnum: 'one',
      aLiteral: 'lorem',
      aDiscriminatedUnion: {
        type: 'type 1',
        foo: 0,
      },
      aNullable: { value: 0 },
      aComplexArray: [{ stairs: 0, elevators: 0 }],
      anArrayWithIds: [{ id: 'one', somethingElse: 0 }],
      aTuple: ['', 0],
    };
    expect(observed).toEqual(expected);
  });

  test('from form state (non nulls)', () => {
    const formState: FormStateOf<typeof exampleSpecWithoutUnion> = {
      aString: 'hello',
      aNumber: 42,
      aBoolean: true,
      anArray: [36, 37, 38],
      aStruct: { nested: 'nest' },
      anEnum: 'two',
      aLiteral: 'lorem',
      aDiscriminatedUnion: {
        selected: 'type 2',
        variants: {
          'type 1': { foo: 42 },
          'type 2': {
            foo: 'hello',
            aNestedDiscriminatedUnion: {
              selected: 'banana',
              variants: {
                strawberry: { bar: true },
                banana: { baz: [false, true, false] },
              },
            },
          },
        },
      },
      aNullable: {
        isNull: false,
        value: {
          value: 25,
        },
      },
      aComplexArray: [{ stairs: 12, elevators: 2 }],
      anArrayWithIds: [
        { id: 'one', somethingElse: 180 },
        { id: 'two', somethingElse: 360 },
      ],
      aTuple: ['', 42],
    };
    const observed = fromFormState(formState);
    const expected: TypeOf<typeof exampleSpecWithoutUnion> = {
      aString: 'hello',
      aNumber: 42,
      aBoolean: true,
      anArray: [36, 37, 38],
      aStruct: { nested: 'nest' },
      anEnum: 'two',
      aLiteral: 'lorem',
      aDiscriminatedUnion: {
        type: 'type 2',
        foo: 'hello',
        aNestedDiscriminatedUnion: {
          flavour: 'banana',
          baz: [false, true, false],
        },
      },
      aNullable: { value: 25 },
      aComplexArray: [{ stairs: 12, elevators: 2 }],
      anArrayWithIds: [
        { id: 'one', somethingElse: 180 },
        { id: 'two', somethingElse: 360 },
      ],
      aTuple: ['', 42],
    };
    expect(observed).toEqual(expected);
  });

  test('from form state (defaults)', () => {
    const spec = t.struct({
      foo: t.string({ default_: 'hello world' }),
      bar: t.number({ default_: 42 }),
      baz: t.discriminatedUnion(
        'colour',
        [
          t.struct({
            colour: t.literal('red'),
            stuff: t.boolean(),
          }),
          t.struct({
            colour: t.literal('blue'),
            otherStuff: t.array(t.number({ default_: 36 })),
          }),
        ],
        { default_: 'blue' },
      ),
    });
    const { fromFormState } = makeFormStateTransforms(spec);
    const formState: FormStateOf<typeof spec> = {
      foo: null,
      bar: null,
      baz: {
        selected: null,
        variants: {
          red: { stuff: null },
          blue: { otherStuff: [] },
        },
      },
    };
    const expected: TypeOf<typeof spec> = {
      foo: 'hello world',
      bar: 42,
      baz: {
        colour: 'blue',
        otherStuff: [],
      },
    };
    const observed = fromFormState(formState);
    expect(observed).toEqual(expected);
  });
});
