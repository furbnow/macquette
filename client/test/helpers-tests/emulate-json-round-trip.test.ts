import fc from 'fast-check';
import { mapValues } from 'lodash';

import { emulateJsonRoundTrip } from '../../src/helpers/emulate-json-round-trip';

const objectWithToJSON = fc
  .record({
    base: fc.object(),
    jsonRepresentation: fc.anything().filter((val) => val !== undefined),
  })
  .map(({ base, jsonRepresentation }) => withToJSON(base, jsonRepresentation));

function withToJSON(base: Record<string, unknown>, jsonRepresentation: unknown): unknown {
  const proto = {
    toJSON: () => jsonRepresentation,
    [fc.toStringMethod]: () =>
      `withToJSON(${fc.stringify(base)}, ${fc.stringify(jsonRepresentation)})`,
  };
  return Object.create(
    proto,
    mapValues(base, (value) => ({ value, enumerable: true })),
  );
}

describe('emulate JSON round trip', () => {
  it('emulates a JSON round-trip', () => {
    fc.assert(
      fc.property(
        fc
          .oneof(
            fc.anything().filter((val) => val !== undefined),
            objectWithToJSON,
          )
          .filter(
            (val) => !(typeof val === 'object' && val !== null && '__proto__' in val),
          ),
        (val) => {
          expect(emulateJsonRoundTrip(val)).toEqual(JSON.parse(JSON.stringify(val)));
        },
      ),
    );
  });
});
