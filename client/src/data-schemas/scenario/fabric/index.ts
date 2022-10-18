import { z } from 'zod';

import { isIndexable } from '../../../helpers/is-indexable';
import { zodPredicateUnion } from '../../helpers/zod-predicate-union';
import { stringyFloatSchema, stringyIntegerSchema } from '../value-schemas';
import { floorType, perFloorTypeSpecSchema } from './floor-u-value';

const subtractFrom = z.union([
    z.number(),
    z.literal(null),
    z.literal('no').transform(() => null),
    z.literal(undefined).transform(() => null),
    z.string().transform((s) => parseFloat(s)),
]);

/*
 * A note on nomenclature
 * ----------------------
 *
 * Each type of fabric element data has three possible 'shapes' when it is applied to
 * the project:
 *
 * [in fabric.elements]
 * - an 'element' is when the library data is 'added'; it has some data that is taken
 *   from the library, but also things like location, size, overshading, etc.
 * - a 'measure element' is when the element is also a measure. it has everything from
 *   an 'element' plus fields that are 'measure' fields (associated_work &c.)
 *
 * [in fabric.measures]
 * - a 'measure' contains a slightly different subset of data; it doesn't include e.g.
 *   overshading or area but does include cost total, quantity, and loction.
 *
 * In the code below, 'common' indicates that the data is shared among some subset of
 * final 'shapes'.
 *
 * 'basic' is used to name the non-differentiated element/measure element/measure. The
 * fabric element type types specialise these 'basic' types.
 */
const thing = z.object({
    lib: z.string(),
    name: z.string(),
    source: z
        .string()
        .optional()
        .transform((val) => (val === undefined ? '' : val)),
    description: z
        .string()
        .optional()
        .transform((val) => (val === undefined ? '' : val)),
    uvalue: stringyFloatSchema.transform((val) => (val === '' ? 0 : val)),
    kvalue: stringyFloatSchema.transform((val) => (val === '' ? 0 : val)),
});
const location = z
    .union([z.string(), z.number().transform((n) => n.toString(10))])
    .optional()
    .transform((val) => val ?? '');

// This is a more detailed, bespoke version of GenericMeasure
const commonMeasure = z.object({
    associated_work: z.string(),
    benefits: z.string(),
    cost: stringyIntegerSchema.transform((val) => (val === '' ? 0 : val)),
    cost_total: z.number().optional(),
    cost_units: z
        .enum(['kWp', 'ln m', 'sqm', 'unit'])
        .optional()
        .transform((val) => (val === undefined ? 'unit' : val)),
    min_cost: stringyIntegerSchema
        .optional()
        .transform((val) => (val === '' || val === undefined ? 0 : val)),
    description: z.string(),
    disruption: z.string(),
    key_risks: z
        .string()
        .optional()
        .transform((val) => (val === undefined ? '' : val)),
    location,
    maintenance: z.string(),
    notes: z.string(),
    performance: z.string(),
    quantity: z.number().optional(),
    who_by: z.string(),
});

const basicElement = thing.extend({
    id: z.number(),
    location,
    area: stringyFloatSchema,
});
const basicElementMeasure = basicElement.merge(commonMeasure);
const basicMeasure = thing.merge(commonMeasure);

const areaInputsSpecificSchema = z.object({
    area: z.union([z.number(), z.null()]),
});
const areaInputsDimensionsSchema = z.object({
    length: z.union([z.number(), z.null()]),
    height: z.union([z.number(), z.null()]),
    area: z.union([z.number(), z.null()]),
});
const areaInputsSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('specific'),
        specific: areaInputsSpecificSchema,
        dimensions: areaInputsDimensionsSchema.optional(),
    }),
    z.object({
        type: z.literal('dimensions'),
        specific: areaInputsSpecificSchema.optional(),
        dimensions: areaInputsDimensionsSchema,
    }),
]);
export type AreaInputs = z.infer<typeof areaInputsSchema>;

const legacyWallTypes = ['Wall', 'Party_wall', 'Loft', 'Roof'] as const;
const modernWallTypes = ['external wall', 'party wall', 'loft', 'roof'] as const;
const wallTypes = [...legacyWallTypes, ...modernWallTypes] as const;

type LegacyWallType = (typeof legacyWallTypes)[number];
type WallType = (typeof modernWallTypes)[number];

function migrateFromLegacyWallType(val: LegacyWallType | WallType): WallType {
    switch (val) {
        case 'Wall':
            return 'external wall';
        case 'Party_wall':
            return 'party wall';
        case 'Loft':
            return 'loft';
        case 'Roof':
            return 'roof';
        default:
            return val;
    }
}
const commonWall = z.object({
    type: z.enum(wallTypes).transform(migrateFromLegacyWallType),
});
const commonWallElement = z.object({
    areaInputs: areaInputsSchema.optional(),
    l: stringyFloatSchema.default('' as const),
    h: stringyFloatSchema.default('' as const),
    windowarea: z.number().optional(),
    netarea: z.number().optional(),
    wk: z.number().optional(),
});
const commonWallMeasure = z.object({
    cost_units: z
        .union([z.literal('sqm' as const), z.literal('unit' as const)])
        // cost_units are sometimes 'unit' but it's a mistake; should be 'sqm'.
        // this makes no difference to outputs because they're not calculated by the
        // model but persisted.
        .transform((val) => (val === 'unit' ? ('sqm' as const) : val))
        .default('sqm'),
    EWI: z.boolean().default(false),
    tags: z.tuple([z.enum(wallTypes).transform(migrateFromLegacyWallType)]).optional(),
});
const wallLikeElement = basicElement.merge(commonWall).merge(commonWallElement);
const wallLikeMeasureElement = basicElementMeasure
    .merge(commonWall)
    .merge(commonWallElement)
    .merge(commonWallMeasure);
const wallLikeMeasure = zodPredicateUnion([
    {
        name: 'type stored in type',
        predicate: (val) => isIndexable(val) && 'type' in val,
        schema: basicMeasure.merge(commonWall).merge(commonWallMeasure),
    },
    // This is not even a 'legacy' format - just for some reason some measures don't
    // have the 'type' field filled in properly, but in every case we can get it from
    // 'tags'.
    {
        name: 'type stored in tags',
        predicate: (val) => isIndexable(val) && !('type' in val),
        schema: basicMeasure
            .merge(commonWallMeasure)
            .extend({
                tags: z.tuple([z.enum(legacyWallTypes)]),
            })
            .transform((element) => {
                const type = element.tags[0];
                return {
                    ...element,
                    type: migrateFromLegacyWallType(type),
                    tags: undefined,
                };
            }),
    },
]);
export type WallLikeElement =
    | z.infer<typeof wallLikeElement>
    | z.infer<typeof wallLikeMeasureElement>;

const commonOpening = z.object({
    type: z
        .enum(['door', 'roof light', 'window', 'Door', 'Roof_light', 'window', 'Window'])
        .transform((val) => {
            switch (val) {
                case 'Door':
                    return 'door';
                case 'Roof_light':
                    return 'roof light';
                case 'Window':
                    return 'window';
                default:
                    return val;
            }
        }),
    g: stringyFloatSchema,
    gL: stringyFloatSchema,
    ff: stringyFloatSchema,
});
const commonOpeningElement = z.object({
    l: stringyFloatSchema,
    h: stringyFloatSchema,
    orientation: stringyIntegerSchema,
    overshading: stringyIntegerSchema,
    subtractfrom: subtractFrom,
});
const openingElement = basicElement.merge(commonOpening).merge(commonOpeningElement);
const openingMeasureElement = basicElementMeasure
    .merge(commonOpening)
    .merge(commonOpeningElement);
const openingMeasure = basicMeasure.merge(commonOpening);

const commonHatch = z.object({
    type: z.enum(['hatch', 'Hatch']).transform(() => 'hatch' as const),
});
const commonHatchElement = z.object({
    subtractfrom: subtractFrom,
    l: stringyFloatSchema,
    h: stringyFloatSchema,
});
const hatchElement = basicElement.merge(commonHatch).merge(commonHatchElement);
const hatchElementMeasure = basicElementMeasure
    .merge(commonHatch)
    .merge(commonHatchElement);
const hatchMeasure = basicMeasure.merge(commonHatch);

const commonFloor = z.object({
    type: z.enum(['floor', 'Floor']).transform(() => 'floor' as const),
});
const commonFloorElement = z.object({
    // `perimeter` should one day be renamed to `exposedPerimeter` (or
    // something) and go in the per floor type spec, but for now we keep it
    // here because legacy JS references it
    perimeter: stringyFloatSchema.optional(),
    selectedFloorType: floorType.optional(),
    perFloorTypeSpec: perFloorTypeSpecSchema.optional(),

    // Output fields
    wk: stringyFloatSchema.optional(),
});

const floorElement = basicElement.merge(commonFloor).merge(commonFloorElement);
const floorMeasureElement = basicElementMeasure
    .merge(commonFloor)
    .merge(commonFloorElement);
const floorMeasure = basicMeasure.merge(commonFloor);
export const floorSchema = floorElement;
export type Floor = z.infer<typeof floorSchema>;

function typeFieldMatches(validTypes: string[]) {
    return (elem: unknown) => {
        if (!isIndexable(elem)) {
            return false;
        }
        if (typeof elem['type'] === 'string' && validTypes.includes(elem['type'])) {
            return true;
        }
        if (
            Array.isArray(elem['tags']) &&
            typeof elem['tags'][0] === 'string' &&
            validTypes.includes(elem['tags'][0])
        ) {
            return true;
        }
        return false;
    };
}

export const fabricElement = zodPredicateUnion([
    {
        predicate: typeFieldMatches([...legacyWallTypes, ...modernWallTypes]),
        schema: z.union([wallLikeMeasureElement, wallLikeElement]),
    },
    {
        predicate: typeFieldMatches([
            'door',
            'roof light',
            'window',
            'Door',
            'Roof_light',
            'window',
            'Window',
        ]),
        schema: z.union([openingMeasureElement, openingElement]),
    },
    {
        predicate: typeFieldMatches(['hatch', 'Hatch']),
        schema: z.union([hatchElementMeasure, hatchElement]),
    },
    {
        predicate: typeFieldMatches(['floor', 'Floor']),
        schema: z.union([floorMeasureElement, floorElement]),
    },
]);
export type FabricElement = z.infer<typeof fabricElement>;

export function isWallLike(element: FabricElement): element is WallLikeElement {
    return (
        element.type === 'external wall' ||
        element.type === 'party wall' ||
        element.type === 'loft' ||
        element.type === 'roof'
    );
}

export const fabricMeasure = zodPredicateUnion([
    {
        predicate: typeFieldMatches([...legacyWallTypes, ...modernWallTypes]),
        schema: wallLikeMeasure,
    },
    {
        predicate: typeFieldMatches([
            'door',
            'roof light',
            'window',
            'Door',
            'Roof_light',
            'window',
            'Window',
        ]),
        schema: openingMeasure,
    },
    {
        predicate: typeFieldMatches(['hatch', 'Hatch']),
        schema: hatchMeasure,
    },
    {
        predicate: typeFieldMatches(['floor', 'Floor']),
        schema: floorMeasure,
    },
]);

export const fabric = z.object({
    elements: z.array(fabricElement).optional(),
    measures: z
        .record(
            z.object({
                measure: fabricMeasure,
                original_elements: z.record(z.object({ id: z.number() })).optional(),
            }),
        )
        .optional(),
    thermal_bridging_yvalue: stringyFloatSchema
        .refine((v) => v !== '', 'empty string is not allowed here')
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        .transform((v) => v as Exclude<typeof v, ''>)
        .optional(),
    global_TMP: z
        .union([
            z.boolean(),
            z.literal(1).transform(() => true),
            z.literal(0).transform(() => false),
        ])
        .optional(),
    global_TMP_value: z.number().nullable().optional(),
});
