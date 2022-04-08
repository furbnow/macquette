import { camelise, cameliseStr } from '../../../src/v2/api/http';
import * as fc from 'fast-check';

const inputNameArb = fc.stringOf(fc.constantFrom('a', 'b', 'c', 'A', 'B', 'C', '_'));
const { tree: recursiveObjectArb } = fc.letrec((tie) => ({
    tree: fc.oneof({ depthFactor: 0.5, withCrossShrink: true }, tie('array'), tie('obj')),
    array: fc.array(tie('obj')),
    obj: fc.object({ key: inputNameArb }),
}));

describe('camelise function', () => {
    test('always returns a string with no underscores', () => {
        fc.assert(
            fc.property(inputNameArb, (str) => {
                const result = cameliseStr(str);
                for (const key of Object.keys(result)) {
                    expect(key).not.toContain('_');
                }
            }),
        );
    });

    test('always returns an object with no underscores in key names', () => {
        fc.assert(
            fc.property(recursiveObjectArb, (obj) => {
                const result = camelise(obj) as object;
                for (const key of Object.keys(result)) {
                    expect(key).not.toContain('_');
                }
            }),
        );
    });
});
