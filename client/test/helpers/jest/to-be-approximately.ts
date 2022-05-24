import { CompareFloatParams, compareFloats } from '../fuzzy-float-equality';

type Params = { tolerance?: number; absoluteToleranceAroundZero?: number };

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        interface Matchers<R> {
            toBeApproximately: (expected: number, params?: Params) => CustomMatcherResult;
        }
    }
}

expect.extend({
    toBeApproximately: (
        received: number,
        expected: number,
        params?: CompareFloatParams,
    ) => {
        const pass = compareFloats(params)(received, expected);
        const message = () =>
            pass
                ? `expected ${received} to not be approximately ${expected}`
                : `expected ${received} to be approximately ${expected}`;
        return { pass, message };
    },
});

export {};
