export type CompareFloatParams = {
    // Maximum tolerable relative error, defined as
    // `|(expected - received)/expected|`
    tolerance?: number;

    // If expected = 0, the above formula is undefined, so this is the maximum
    // tolerable value of `|received|`
    absoluteToleranceAroundZero?: number;
};

export const compareFloats = (
    received: number,
    expected: number,
    params?: CompareFloatParams,
) => {
    // Edge cases
    if (!Number.isFinite(expected)) {
        return Object.is(received, expected);
    }
    if (Object.is(expected, 0) || Object.is(expected, -0)) {
        const tolerance = params?.absoluteToleranceAroundZero ?? 0;
        return Math.abs(received) <= tolerance;
    }

    // Non-zero rational numbers
    const tolerance = params?.tolerance ?? 0.0001;
    const normalisedDifference = Math.abs((expected - received) / expected);
    return normalisedDifference < tolerance;
};
