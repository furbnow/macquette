import fc from 'fast-check';
import { z } from 'zod';

import { withWarningsSchema } from '../../../src/v2/data-schemas/helpers/with-warnings';
import { emulateJsonRoundTrip } from '../../../src/v2/helpers/emulate-json-round-trip';
import { WithWarnings } from '../../../src/v2/helpers/with-warnings';

function arbWithWarnings<V, W>(val: fc.Arbitrary<V>, warning: fc.Arbitrary<W>) {
    return fc
        .tuple(val, fc.set(warning))
        .map(([val, warnings]) => new WithWarnings(val, new Set(warnings)));
}

describe('with warnings type', () => {
    it('survives a JSON and Zod-parse round-trip', () => {
        const arb = arbWithWarnings(
            fc.jsonValue().map((v) => emulateJsonRoundTrip(v)),
            fc.jsonValue().map((v) => emulateJsonRoundTrip(v)),
        );
        fc.assert(
            fc.property(arb, (original) => {
                const roundTripped = withWarningsSchema(z.unknown(), z.unknown()).parse(
                    emulateJsonRoundTrip(original),
                );
                expect(roundTripped).toEqual(original);
            }),
        );
    });
});
