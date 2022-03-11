import fc from 'fast-check';
import { legacyCloneDeep } from '../../src/v2/helpers/legacy-clone';

describe('legacy clone deep', () => {
    it('emulates a JSON round-trip', () => {
        fc.assert(
            fc.property(
                fc.anything().filter((val) => val !== undefined),
                (val) => {
                    expect(legacyCloneDeep(val)).toEqual(JSON.parse(JSON.stringify(val)));
                },
            ),
        );
    });
});
