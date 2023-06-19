export type CompareFloatParams = {
    // Maximum tolerable relative error, defined as
    // `|(expected - received)/expected|`
    tolerance?: number;

    // If expected is close to 0, the above formula breaks down, so we specify
    // a tolerance in absolute terms in that case.
    absoluteToleranceAroundZero?: number;
};

export function compareFloats(
    received: number,
    expected: number,
    params?: CompareFloatParams,
) {
    // Edge cases
    if (!Number.isFinite(expected)) {
        return Object.is(received, expected);
    }
    const absoluteToleranceAroundZero = params?.absoluteToleranceAroundZero ?? 0.0001;
    if (Math.abs(expected) < absoluteToleranceAroundZero) {
        return Math.abs(received) < absoluteToleranceAroundZero;
    }

    // Non-zero rational numbers
    const tolerance = params?.tolerance ?? 0.0001;
    const normalisedDifference = Math.abs((expected - received) / expected);
    return normalisedDifference < tolerance;
}
