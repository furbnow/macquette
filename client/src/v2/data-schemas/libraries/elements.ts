import { z } from 'zod';

import { assertNever } from '../../helpers/assertNever';
import { legacyBoolean, stringyFloatSchema } from '../scenario/value-schemas';
import {
    makeLibrarySchema,
    libraryItemCommonSchema,
    measureCommonSchema,
} from './common';

function singleElementArray<T extends string>(value: T) {
    return z.custom<[T]>((toValidate) => {
        return (
            Array.isArray(toValidate) &&
            toValidate.length === 1 &&
            toValidate[0] === value
        );
    }, `required value to be [${value}]`);
}

const commonFabricElement = z.object({
    source: z.string(),
    description: z.string().optional(),
    uvalue: stringyFloatSchema,
    kvalue: stringyFloatSchema,
});

const withWindowLike = {
    g: stringyFloatSchema,
    ff: stringyFloatSchema,
    gL: stringyFloatSchema,
};

const door = commonFabricElement
    .extend({
        tags: singleElementArray('Door'),
        ...withWindowLike,
    })
    .merge(libraryItemCommonSchema);

const doorMeasure = door.merge(measureCommonSchema);

const roofLight = commonFabricElement
    .extend({
        tags: singleElementArray('Roof_light'),
        ...withWindowLike,
    })
    .merge(libraryItemCommonSchema);

const roofLightMeasure = roofLight.merge(measureCommonSchema);

const window_ = commonFabricElement
    .extend({
        tags: singleElementArray('Window'),
        ...withWindowLike,
    })
    .merge(libraryItemCommonSchema);

const windowMeasure = window_.merge(measureCommonSchema);

const wall = commonFabricElement
    .extend({
        tags: singleElementArray('Wall'),
    })
    .merge(libraryItemCommonSchema);
export type Wall = z.infer<typeof wall>;

const wallMeasure = wall
    .extend({
        EWI: legacyBoolean,
    })
    .merge(libraryItemCommonSchema)
    .merge(measureCommonSchema);
export type WallMeasure = z.infer<typeof wallMeasure>;

const floor = commonFabricElement
    .extend({
        tags: singleElementArray('Floor'),
    })
    .merge(libraryItemCommonSchema);

const floorMeasure = floor.merge(measureCommonSchema);

const hatch = commonFabricElement
    .extend({
        tags: singleElementArray('Hatch'),
    })
    .merge(libraryItemCommonSchema);

const hatchMeasure = hatch.merge(measureCommonSchema);

const partyWall = commonFabricElement
    .extend({
        tags: singleElementArray('Party_wall'),
    })
    .merge(libraryItemCommonSchema);

const partyWallMeasure = partyWall.merge(measureCommonSchema);

const loft = commonFabricElement
    .extend({
        tags: singleElementArray('Loft'),
    })
    .merge(libraryItemCommonSchema);

const loftMeasure = loft.merge(measureCommonSchema);

const roof = commonFabricElement
    .extend({
        tags: singleElementArray('Roof'),
    })
    .merge(libraryItemCommonSchema);

const roofMeasure = roof.merge(measureCommonSchema);

const elements = [
    ...(
        [wall, door, floor, hatch, partyWall, roofLight, window_, loft, roof] as const
    ).map((s) => s.passthrough()),
];

const measures = [
    ...(
        [
            wallMeasure,
            doorMeasure,
            floorMeasure,
            hatchMeasure,
            partyWallMeasure,
            roofLightMeasure,
            windowMeasure,
            loftMeasure,
            roofMeasure,
        ] as const
    ).map((s) => s.passthrough()),
];

function assertAtLeastTwoElements<T>(arr: T[]): [T, T, ...T[]] {
    if (arr.length < 2) {
        throw new Error('Assertion failed: array had fewer than 2 elements');
    } else {
        // SAFETY: Checked by length check
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return arr as [T, T, ...T[]];
    }
}

const item = z.union(assertAtLeastTwoElements(elements));
const measure = z.union(assertAtLeastTwoElements(measures));

export const fabricElements = makeLibrarySchema('elements', item);
export const fabricElementsMeasures = makeLibrarySchema('elements_measures', measure);

// Example usage for discriminating on the value of tags

export function discriminateTags<
    InputT extends { tags: [string] },
    DesiredT extends InputT & { tags: [DesiredDiscriminator] },
    DesiredDiscriminator extends string,
>(input: InputT, discriminator: DesiredDiscriminator): input is DesiredT {
    return input.tags[0] === discriminator;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function doSomethingWithFabricElement(val: z.infer<typeof item>) {
    if (
        discriminateTags(val, 'Door') ||
        discriminateTags(val, 'Window') ||
        discriminateTags(val, 'Roof_light')
    ) {
        val.gL;
    } else if (
        discriminateTags(val, 'Wall') ||
        discriminateTags(val, 'Party_wall') ||
        discriminateTags(val, 'Floor') ||
        discriminateTags(val, 'Hatch') ||
        discriminateTags(val, 'Loft') ||
        discriminateTags(val, 'Roof')
    ) {
        val.uvalue;
    } else {
        assertNever(val);
    }
}
