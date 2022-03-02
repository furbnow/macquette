import fc from 'fast-check';
import { arbFloat } from '../../../helpers/arbitraries';

export const sensibleFloat = arbFloat({ noDefaultInfinity: true, noNaN: true }).filter(
    (floatVal) => {
        if (Object.is(floatVal, -0)) {
            return false;
        }
        if (floatVal === 0) {
            return true;
        }
        const log2Abs = Math.log2(Math.abs(floatVal));
        if (log2Abs > -7 && log2Abs < 13) {
            return true;
        }
        return false;
    },
);

type StringyNumberOptions = { excludeNumericStrings?: boolean };
export const stringySensibleFloat = (options?: StringyNumberOptions) =>
    stringyNumber(sensibleFloat, options);
export const stringyInteger = (options?: StringyNumberOptions) =>
    stringyNumber(fc.integer(), options);
export const stringyNumber = (
    number: fc.Arbitrary<number>,
    options?: StringyNumberOptions,
) => {
    const poss = [
        number,
        fc.constant(''),
        ...(options?.excludeNumericStrings ? [] : [number.map((f) => f.toString(10))]),
    ];
    return fc.oneof(...poss);
};

export const legacyBoolean = () => fc.oneof(fc.constant(1), fc.boolean());
