import { z } from 'zod';

import { zodNullableObject } from '../../../src/data-schemas/helpers/nullable-object';

describe('zod nullable object', () => {
    const schema = zodNullableObject({
        a: z.string(),
        b: z.number(),
    });
    it('validates objects which would validate without the schema being nullable', () => {
        expect(() => schema.parse({ a: 'foo', b: 42 })).not.toThrow();
    });

    it('validates objects with nulls in', () => {
        expect(() => schema.parse({ a: 'foo', b: null })).not.toThrow();
    });

    test.each<unknown>([
        { a: 42, b: 42 },
        {},
        { a: 'hello' },
        { a: 'hello', b: undefined },
    ])('it still rejects invalid objects', (obj) => {
        expect(() => schema.parse(obj)).toThrow();
    });

    it('does not make a property nullable if it is a nested object', () => {
        const schema = zodNullableObject({
            a: z.string(),
            b: z.object({
                c: z.number(),
            }),
        });
        expect(() => schema.parse({ a: 'foo', b: null })).toThrow();
    });

    it('does not extend the nullability deeply into nested objects', () => {
        const schema = zodNullableObject({
            a: z.string(),
            b: z.object({
                c: z.number(),
            }),
        });
        expect(() => schema.parse({ a: 'foo', b: { c: null } })).toThrow();
    });
});
