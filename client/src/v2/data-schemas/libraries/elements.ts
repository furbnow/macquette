import { z } from 'zod';

import type { Library } from '.';
import { isIndexable } from '../../helpers/is-indexable';
import { zodPredicateUnion } from '../helpers/zod-predicate-union';
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
    description: z
        .string()
        .optional()
        .transform((d) => (d === '' || d === undefined ? null : d)),
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

function tagsFieldContains(validTags: string[]) {
    return (elem: unknown) =>
        isIndexable(elem) &&
        Array.isArray(elem['tags']) &&
        elem['tags'].some(
            (tag: unknown) => typeof tag === 'string' && validTags.includes(tag),
        );
}

const fabricElement = zodPredicateUnion([
    { predicate: tagsFieldContains(['Wall']), schema: wall.passthrough() },
    { predicate: tagsFieldContains(['Door']), schema: door.passthrough() },
    { predicate: tagsFieldContains(['Floor']), schema: floor.passthrough() },
    { predicate: tagsFieldContains(['Hatch']), schema: hatch.passthrough() },
    { predicate: tagsFieldContains(['Party_wall']), schema: partyWall.passthrough() },
    { predicate: tagsFieldContains(['Roof_light']), schema: roofLight.passthrough() },
    { predicate: tagsFieldContains(['Window']), schema: window_.passthrough() },
    { predicate: tagsFieldContains(['Loft']), schema: loft.passthrough() },
    { predicate: tagsFieldContains(['Roof']), schema: roof.passthrough() },
]);

const measure = zodPredicateUnion([
    { predicate: tagsFieldContains(['Wall']), schema: wallMeasure.passthrough() },
    { predicate: tagsFieldContains(['Door']), schema: doorMeasure.passthrough() },
    { predicate: tagsFieldContains(['Floor']), schema: floorMeasure.passthrough() },
    { predicate: tagsFieldContains(['Hatch']), schema: hatchMeasure.passthrough() },
    {
        predicate: tagsFieldContains(['Party_wall']),
        schema: partyWallMeasure.passthrough(),
    },
    {
        predicate: tagsFieldContains(['Roof_light']),
        schema: roofLightMeasure.passthrough(),
    },
    { predicate: tagsFieldContains(['Window']), schema: windowMeasure.passthrough() },
    { predicate: tagsFieldContains(['Loft']), schema: loftMeasure.passthrough() },
    { predicate: tagsFieldContains(['Roof']), schema: roofMeasure.passthrough() },
]);

export type FabricElement = z.infer<typeof fabricElement>;

export const fabricElements = makeLibrarySchema<'elements', FabricElement>(
    'elements',
    fabricElement,
);
export type FabricElementsLibrary = z.infer<typeof fabricElements>;
export function isFabricElementsLibrary(
    library: Library,
): library is FabricElementsLibrary {
    return library.type === 'elements';
}

export const fabricElementsMeasures = makeLibrarySchema('elements_measures', measure);

export function discriminateTags<
    InputT extends { tags: [string] },
    DesiredT extends InputT & { tags: [DesiredDiscriminator] },
    DesiredDiscriminator extends string,
>(discriminator: DesiredDiscriminator) {
    return (input: InputT): input is DesiredT => {
        return input.tags[0] === discriminator;
    };
}
