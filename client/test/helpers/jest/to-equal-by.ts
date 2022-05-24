import { inspect } from 'util';

import { flatten } from '../object-flattening';
import { compareSets } from '../set-operations';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        interface Matchers<R> {
            /** Deep-compare two objects like .toEqual, but compare primitives
             * using the provided compare function
             */
            toEqualBy: (
                expected: unknown,
                compare: (a: unknown, b: unknown) => boolean,
            ) => CustomMatcherResult;
        }
    }
}

expect.extend({
    toEqualBy(
        received: unknown,
        expected: unknown,
        compare: (received: unknown, expected: unknown) => boolean,
    ) {
        const flatReceived = flatten(received);
        const flatExpected = flatten(expected);
        const keysComparisonResult = compareSets(
            new Set(flatReceived.keys()),
            new Set(flatExpected.keys()),
        );
        if (keysComparisonResult.onlyRHS.size !== 0) {
            return {
                pass: false,
                message: () =>
                    ['Missing keys:', ...keysComparisonResult.onlyRHS].join('\n'),
            };
        }
        if (keysComparisonResult.onlyLHS.size !== 0) {
            return {
                pass: false,
                message: () =>
                    ['Extraneous keys:', ...keysComparisonResult.onlyLHS].join('\n'),
            };
        }
        const failures = [...keysComparisonResult.intersection].flatMap((keySequence) => {
            const receivedValue = flatReceived.get(keySequence);
            const expectedValue = flatExpected.get(keySequence);
            if (compare(receivedValue, expectedValue)) {
                return [];
            } else {
                return [
                    {
                        keySequence: keySequence,
                        received: receivedValue,
                        expected: expectedValue,
                    },
                ];
            }
        });
        if (failures.length === 0) {
            return {
                pass: true,
                message: () => 'Values were equal',
            };
        } else {
            return {
                pass: false,
                message: () => {
                    return [
                        'Values differed',
                        ...failures.flatMap(({ keySequence, received, expected }) => [
                            `- ${keySequence}: ${inspect(expected)}`,
                            `+ ${keySequence}: ${inspect(received)}`,
                        ]),
                    ].join('\n');
                },
            };
        }
    },
});

export {};
