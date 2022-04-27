import fc from 'fast-check';

import { emulateJsonRoundTrip } from '../../src/v2/helpers/emulate-json-round-trip';

describe('legacy clone deep', () => {
    it('emulates a JSON round-trip', () => {
        fc.assert(
            fc.property(
                fc.anything().filter((val) => val !== undefined),
                (val) => {
                    expect(emulateJsonRoundTrip(val)).toEqual(
                        JSON.parse(JSON.stringify(val)),
                    );
                },
            ),
        );
    });
});
