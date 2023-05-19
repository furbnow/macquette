import { last } from 'lodash';
import {
    TypeOf,
    Visitable,
    Visitor,
} from '../../../../src/v2/data-schemas/visitable-types';

const dummyVisitor: Visitor<unknown> = {
    string: () => 'hello world',
    number: () => 42,
    boolean: () => false,
    array: (elemT) => [elemT, elemT, elemT],
    struct: (shape) => shape,
    enum: (values) => last(values),
    literal: (value) => value,
    discriminatedUnion: (field, shapes) => {
        const entries = Object.entries(shapes);
        expect(entries).not.toEqual([]);
        // SAFETY: By above expectation
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const [firstValue, firstShape] = Object.entries(shapes)[0]!;
        return {
            [field]: firstValue,
            ...firstShape,
        };
    },
    nullable: () => null,
};

export function makeDummyValue<Spec extends Visitable>(spec: Spec) {
    // SAFETY: By tests
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return spec.visit(dummyVisitor) as TypeOf<Spec>;
}
