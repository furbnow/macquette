import { inspect } from 'util';

import { flatten } from '../object-flattening';

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
        isEqual: (
          path: string,
          receivedMissing: boolean,
          receivedValue: unknown,
          expectedMissing: boolean,
          expectedValue: unknown,
        ) => boolean,
      ) => CustomMatcherResult;
    }
  }
}

expect.extend({
  toEqualBy(
    received: unknown,
    expected: unknown,
    isEqual: (
      path: string,
      receivedMissing: boolean,
      receivedValue: unknown,
      expectedMissing: boolean,
      expectedValue: unknown,
    ) => boolean,
  ) {
    const flatReceived = flatten(received);
    const flatExpected = flatten(expected);
    const allKeys = new Set([...flatReceived.keys(), ...flatExpected.keys()]);

    const failures = [...allKeys].flatMap((keySequence) => {
      const receivedMissing = !flatReceived.has(keySequence);
      const receivedValue = flatReceived.get(keySequence);
      const expectedMissing = !flatExpected.has(keySequence);
      const expectedValue = flatExpected.get(keySequence);
      if (
        isEqual(
          keySequence,
          receivedMissing,
          receivedValue,
          expectedMissing,
          expectedValue,
        )
      ) {
        return [];
      } else {
        return [
          {
            keySequence,
            receivedMissing,
            receivedValue,
            expectedMissing,
            expectedValue,
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
            ...failures.flatMap(
              ({
                keySequence,
                receivedMissing,
                receivedValue,
                expectedMissing,
                expectedValue,
              }) => [
                `- ${keySequence}: ${
                  expectedMissing ? '<missing>' : inspect(expectedValue)
                }`,
                `+ ${keySequence}: ${
                  receivedMissing ? '<missing>' : inspect(receivedValue)
                }`,
              ],
            ),
          ].join('\n');
        },
      };
    }
  },
});

export {};
