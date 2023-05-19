import { t, TypeOf } from '../../../../src/v2/data-schemas/visitable-types';
import {
    FormStateOf,
    makeFormStateTransforms,
} from '../../../../src/v2/data-schemas/visitable-types/form-state';
import { exampleSpec } from './example-spec';

describe('form state', () => {
    const { fromFormState, toFormState } = makeFormStateTransforms(exampleSpec);
    test('to form state', () => {
        const value: TypeOf<typeof exampleSpec> = {
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
        };
        const observed = toFormState(value);
        const expected: FormStateOf<typeof exampleSpec> = {
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
        };
        expect(observed).toEqual(expected);
    });

    test('from form state (nulls)', () => {
        const formState: FormStateOf<typeof exampleSpec> = {
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
        };
        const observed = fromFormState(formState);
        const expected: TypeOf<typeof exampleSpec> = {
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
        };
        expect(observed).toEqual(expected);
    });

    test('from form state (non nulls)', () => {
        const formState: FormStateOf<typeof exampleSpec> = {
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
        };
        const observed = fromFormState(formState);
        const expected: TypeOf<typeof exampleSpec> = {
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
        };
        expect(observed).toEqual(expected);
    });

    test('from form state (defaults)', () => {
        const spec = t.struct({
            foo: t.string({ default_: 'hello world' }),
            bar: t.number({ default_: 42 }),
            baz: t.discriminatedUnion(
                'colour',
                {
                    red: {
                        stuff: t.boolean(),
                    },
                    blue: {
                        otherStuff: t.array(t.number({ default_: 36 })),
                    },
                },
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
