/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-unsafe-member-access,
    @typescript-eslint/consistent-type-assertions
 */
import fc, { toStringMethod } from 'fast-check';

import { FloorLayerSpec } from '../../src/data-schemas/scenario/fabric/floor-u-value';
import { Proportion } from '../../src/helpers/proportion';
import { Month } from '../../src/model/enums/month';
import { Orientation } from '../../src/model/enums/orientation';
import { Overshading } from '../../src/model/enums/overshading';
import { Region } from '../../src/model/enums/region';
import { FloorLayerInput } from '../../src/model/modules/fabric/floor-u-value-calculator/floor-layer-input';

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

(FloorLayerInput.prototype as any)[toStringMethod] = function () {
    const that = this as FloorLayerInput;
    let bridging: FloorLayerSpec['bridging'];
    if (that.bridging === null) {
        bridging = {
            material: null,
            proportion: null,
        };
    } else {
        bridging = that.bridging;
    }
    const spec: FloorLayerSpec = {
        thickness: that.thickness,
        mainMaterial: that.mainMaterial,
        bridging,
    };
    const stringifiedSpec = fc.stringify(spec);
    return `FloorLayerInput.validate(${stringifiedSpec}).unwrap(() => undefined).unwrap()`;
};
