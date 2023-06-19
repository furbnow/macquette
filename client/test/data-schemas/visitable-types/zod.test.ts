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
        } satisfies z.infer<typeof zodSchema>;
        expect(zodSchema.parse(goodData)).toEqual(goodData);
    });

    test('visitor test (bad data)', () => {
        const goodData = {
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
        };
        expect(() => zodSchema.parse(goodData)).toThrow(z.ZodError);
    });
});
