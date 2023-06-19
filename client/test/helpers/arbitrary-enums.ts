import fc from 'fast-check';

import { Orientation } from '../../src/model/enums/orientation';
import { Overshading } from '../../src/model/enums/overshading';
import { Region } from '../../src/model/enums/region';

export const arbitraryOrientation = fc.oneof(...Orientation.all.map(fc.constant));
export const arbitraryOvershading = fc.oneof(...Overshading.all.map(fc.constant));
export const arbitraryRegion = fc.oneof(...Region.all.map(fc.constant));
