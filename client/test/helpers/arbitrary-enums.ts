import fc from 'fast-check';

import { Orientation } from '../../src/v2/model/enums/orientation';
import { Overshading } from '../../src/v2/model/enums/overshading';
import { Region } from '../../src/v2/model/enums/region';

export const arbitraryOrientation = fc.oneof(...Orientation.all.map(fc.constant));
export const arbitraryOvershading = fc.oneof(...Overshading.all.map(fc.constant));
export const arbitraryRegion = fc.oneof(...Region.all.map(fc.constant));
