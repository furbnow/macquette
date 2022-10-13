import fc from 'fast-check';
import { z } from 'zod';

import { resultSchema } from '../../../src/v2/data-schemas/helpers/result';
import { emulateJsonRoundTrip } from '../../../src/v2/helpers/emulate-json-round-trip';
import { Result } from '../../../src/v2/helpers/result';

function arbResult<V, E>(ok: fc.Arbitrary<V>, err: fc.Arbitrary<E>) {
    return fc
        .boolean()
        .chain((isOk) =>
            isOk
                ? ok.map((v): Result<V, E> => Result.ok(v))
                : err.map((v) => Result.err(v)),
        );
}

describe('result type', () => {
    it('survives a JSON and Zod-parse round-trip', () => {
        const arb = arbResult(
            fc.jsonValue().map((v) => emulateJsonRoundTrip(v)),
            fc.jsonValue().map((v) => emulateJsonRoundTrip(v)),
        );
        fc.assert(
            fc.property(arb, (original) => {
                const roundTripped = resultSchema(z.unknown(), z.unknown()).parse(
                    emulateJsonRoundTrip(original),
                );
                expect(roundTripped).toEqual(original);
            }),
        );
    });
});
