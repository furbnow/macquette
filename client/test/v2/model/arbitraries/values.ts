import fc from 'fast-check';
import { arbFloat } from '../../../helpers/arbitraries';

export const sensibleFloat = fc.oneof(
    arbFloat({
        noDefaultInfinity: true,
        noNaN: true,
        min: -Math.pow(2, 13),
        max: -Math.pow(2, -7),
    }),
    arbFloat({
        noDefaultInfinity: true,
        noNaN: true,
        min: Math.pow(2, -7),
        max: Math.pow(2, 13),
    }),
    fc.constant(0),
);

type StringyNumberOptions = { excludeNumericStrings?: boolean };
export const stringySensibleFloat = (options?: StringyNumberOptions) =>
    stringyNumber(sensibleFloat, options);
export const stringySensibleInteger = (options?: StringyNumberOptions) =>
    stringyNumber(fc.integer({ min: -Math.pow(2, 7), max: Math.pow(2, 7) }), options);
export const stringyNumber = (
    number: fc.Arbitrary<number>,
    options?: StringyNumberOptions,
) => {
    const poss = [
        number,
        fc.constant(''),
        ...(options?.excludeNumericStrings ?? false
            ? []
            : [number.map((f) => f.toString(10))]),
    ];
    return fc.oneof(...poss);
};

export const legacyBoolean = () => fc.oneof(fc.constant(1), fc.boolean());
