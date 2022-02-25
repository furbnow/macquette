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

export const stringySensibleFloat = () => stringyNumber(sensibleFloat);
export const stringyInteger = () => stringyNumber(fc.integer());
export const stringyNumber = (number: fc.Arbitrary<number>) =>
    fc.oneof(
        number,
        number.map((f) => f.toString(10)),
        fc.constant(''),
    );
export const legacyBoolean = () => fc.oneof(fc.constant(1), fc.boolean());
