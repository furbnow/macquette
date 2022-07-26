import { isIndexable } from '../../../src/v2/helpers/is-indexable';

describe('is indexable', () => {
    it.each([
        {
            name: 'empty object',
            plainObject: {},
        },
        {
            name: 'populated object',
            plainObject: {
                foo: 42,
                bar: new Set([43]),
            },
        },
    ])('returns true for plain objects ($name)', ({ plainObject }) => {
        expect(isIndexable(plainObject)).toBe(true);
    });

    it('returns false for null', () => {
        expect(isIndexable(null)).toBe(false);
    });

    it.each([
        { name: 'empty array', array: [] },
        { name: 'populated array', array: [1, 2, 3] },
        { name: 'sparse array', array: new Array<never>(10) },
    ])('returns false for arrays ($name)', ({ array }) => {
        expect(isIndexable(array)).toBe(false);
    });

    it.each([
        { name: 'empty class', constructor_: class Empty {} },
        {
            name: 'class with method',
            constructor_: class WithMethod {
                hello() {
                    return 'world';
                }
            },
        },
        { name: 'Map', constructor_: Map },
        { name: 'Set', constructor_: Set },
    ])(
        'returns true for objects instantiated from a class ($name)',
        ({ constructor_ }) => {
            const value = new constructor_();
            expect(isIndexable(value)).toBe(true);
        },
    );

    it.each([
        { name: 'null prototype', proto: null },
        {
            name: 'single item prototype chain',
            proto: Object.create(null, { foo: { value: 42, enumerable: true } }),
        },
        { name: 'two item prototype chain', proto: { foo: 43 } },
    ])(
        'returns true for objects with a manually-assigned prototype ($name)',
        ({ proto }) => {
            const value = Object.create(proto, {});
            expect(isIndexable(value)).toBe(true);
        },
    );
});
