import fc from 'fast-check';

export const merge =
    <U extends Record<string, unknown>>(arbU: fc.Arbitrary<U>) =>
    <V extends Record<string, unknown>>(vv: V) =>
        arbU.map((uu) => ({
            ...uu,
            ...vv,
        }));

export const arbFloat = (options: Omit<fc.FloatConstraints, 'next'> = {}) =>
    fc.float({ ...options, next: true });
