import { z } from 'zod';

import { assertNever } from '../../helpers/assertNever';
import { stringyBoolean } from '../helpers/legacy-booleans';
import { stringyFloatSchema } from '../helpers/legacy-numeric-values';
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

const door = commonFabricElement.extend({
    tags: singleElementArray('Door'),
    ...withWindowLike,
});

const roofLight = commonFabricElement.extend({
    tags: singleElementArray('Roof_light'),
    ...withWindowLike,
});

const window_ = commonFabricElement.extend({
    tags: singleElementArray('Window'),
    ...withWindowLike,
});

const wall = commonFabricElement.extend({
    tags: singleElementArray('Wall'),
});

const wallMeasure = wall.extend({
    EWI: stringyBoolean,
});

const floor = commonFabricElement.extend({
    tags: singleElementArray('Floor'),
});

const hatch = commonFabricElement.extend({
    tags: singleElementArray('Hatch'),
});

const partyWall = commonFabricElement.extend({
    tags: singleElementArray('Party_wall'),
});

const loft = commonFabricElement.extend({
    tags: singleElementArray('Loft'),
});

const roof = commonFabricElement.extend({
    tags: singleElementArray('Roof'),
});

const elements = [
    ...(
        [wall, door, floor, hatch, partyWall, roofLight, window_, loft, roof] as const
    ).map((s) => s.merge(libraryItemCommonSchema).passthrough()),
];

const measures = [
    ...(
        [
            wallMeasure,
            door,
            floor,
            hatch,
            partyWall,
            roofLight,
            window_,
            loft,
            roof,
        ] as const
    ).map((s) =>
        s.merge(libraryItemCommonSchema).merge(measureCommonSchema).passthrough(),
    ),
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
