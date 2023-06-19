import fc from 'fast-check';
import { makeZodSchema } from '../../../src/data-schemas/visitable-types/zod';
import { makeArbitrary } from '../../helpers/make-arbitrary';
import { exampleSpec } from './example-spec';

describe('make arbitrary', () => {
    test('is validated by the equivalent zod schema', () => {
        const arb = makeArbitrary(exampleSpec);
        const schema = makeZodSchema(exampleSpec);
        fc.assert(
            fc.property(arb, (value) => {
                expect(schema.parse(value)).toEqual(value);
            }),
        );
    });
});
