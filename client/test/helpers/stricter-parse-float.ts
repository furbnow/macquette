export const stricterParseFloat = (s: string): number => {
    // Returns NaN in more cases than parseFloat
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
    return 1.0 * (s as any);
};
