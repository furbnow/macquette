import fc from 'fast-check';

export const sensibleFloat = fc.oneof(
  fc.float({
    noDefaultInfinity: true,
    noNaN: true,
    min: -Math.pow(2, 13),
    max: -Math.pow(2, -7),
  }),
  fc.float({
    noDefaultInfinity: true,
    noNaN: true,
    min: Math.pow(2, -7),
    max: Math.pow(2, 13),
  }),
  fc.constant(0),
);

export function legacyBoolean() {
  return fc.oneof(fc.constant(1 as const), fc.boolean());
}
