import { t } from '../../../../src/v2/data-schemas/visitable-types';

/** For use in tests of transforms */
export const exampleSpec = t.struct({
    aString: t.string(),
    aNumber: t.number(),
    aBoolean: t.boolean(),
    anArray: t.array(t.number()),
    aStruct: t.struct({
        nested: t.literal('nest' as const),
    }),
    anEnum: t.enum(['one', 'two', 'three'] as const),
    aLiteral: t.literal('lorem' as const),
    aDiscriminatedUnion: t.discriminatedUnion('type', {
        'type 1': {
            foo: t.number(),
        },
        'type 2': {
            foo: t.string(),
            aNestedDiscriminatedUnion: t.discriminatedUnion('flavour', {
                strawberry: { bar: t.boolean() },
                banana: { baz: t.array(t.boolean()) },
            }),
        },
    }),
    aNullable: t.nullable(
        t.struct({
            value: t.number(),
        }),
    ),
});
