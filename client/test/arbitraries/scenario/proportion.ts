import fc from 'fast-check';

import { Proportion } from '../../../src/helpers/proportion';

export function arbProportion(): fc.Arbitrary<Proportion> {
    return fc
        .float({ noNaN: true, noDefaultInfinity: true, min: 0, max: 1 })
        .map((ratio) => Proportion.fromRatio(ratio).unwrap());
}
