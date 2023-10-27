import fc from 'fast-check';

import { arbFloat } from '../helpers/arbitraries';

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
export function stringySensibleFloat(options?: StringyNumberOptions) {
  return stringyNumber(sensibleFloat, options);
}
export function stringySensibleInteger(options?: StringyNumberOptions) {
  return stringyNumber(
    fc.integer({ min: -Math.pow(2, 7), max: Math.pow(2, 7) }),
    options,
  );
}
export function stringyNumber(
  number: fc.Arbitrary<number>,
  options?: StringyNumberOptions,
) {
  const poss = [
    number,
    fc.constant(''),
    ...(options?.excludeNumericStrings ?? false
      ? []
      : [number.map((f) => f.toString(10))]),
  ];
  return fc.oneof(...poss);
}

export function legacyBoolean() {
  return fc.oneof(fc.constant(1 as const), fc.boolean());
}
