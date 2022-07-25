/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-unsafe-member-access,
    @typescript-eslint/consistent-type-assertions
 */
import fc, { toStringMethod } from 'fast-check';

import { Proportion } from '../../src/v2/helpers/proportion';
import { Month } from '../../src/v2/model/enums/month';
import { Orientation } from '../../src/v2/model/enums/orientation';
import { Overshading } from '../../src/v2/model/enums/overshading';
import { Region } from '../../src/v2/model/enums/region';

(Overshading.prototype as any)[toStringMethod] = function () {
    const input = fc.stringify((this as Overshading).name);
    return `new Overshading(${input})`;
};

(Orientation.prototype as any)[toStringMethod] = function () {
    const input = fc.stringify((this as Orientation).name);
    return `new Orientation(${input})`;
};

(Region.prototype as any)[toStringMethod] = function () {
    const input = fc.stringify((this as Region).name);
    return `new Region(${input})`;
};

(Month.prototype as any)[toStringMethod] = function () {
    const input = fc.stringify((this as Month).name);
    return `new Month(${input})`;
};

(Proportion.prototype as any)[toStringMethod] = function () {
    const ratio = fc.stringify((this as Proportion).asRatio);
    return `Proportion.fromRatio(${ratio}).unwrap()`;
};
