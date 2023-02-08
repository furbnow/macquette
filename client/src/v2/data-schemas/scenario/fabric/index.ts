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
 * We use the following names for subsets of fabric data:
 * - 'library' means the data as it is in the library, without representing any
 *   particular application of that data
 * - 'applied' means the library element was copied into the assessment to represent
 *   a particular building element.  It has properties like area, length, etc.
 * - 'element' means that the data is for the baseline condition, i.e. not a measure
 * - 'measure' means that the data is for a measure, i.e. not something that is done
 *   in the baseline condition of the building but that requires works
 *
 * An element that has been inserted into an assessment could be a combination of all
 * of:
 * - commonLibraryElement
 * - commonLibraryMeasure
 * - appliedElementData
 * - appliedMeasureData
 * plus whatever particulars for a given type (e.g. l & h for walls).
 */
const commonLibraryElement = z.object({
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
const commonLibraryMeasure = z.object({
    associated_work: z.string(),
    benefits: z.string(),
    cost: stringyIntegerSchema.transform((val) => (val === '' ? 0 : val)),
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
    maintenance: z.string(),
    notes: z.string(),
    performance: z.string(),
    who_by: z.string(),
});
const commonAppliedElement = z.object({
    id: z.number(),
    location: z
        .union([z.string(), z.number().transform((n) => n.toString(10))])
        .optional()
        .transform((val) => val ?? ''),
    area: stringyFloatSchema,
});
const commonAppliedMeasure = commonLibraryElement
    .merge(commonAppliedElement)
    .merge(commonLibraryMeasure)
    .extend({
        cost_total: z.number().optional(),
        quantity: z.number().optional(),
    });

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

type LegacyWallType = typeof legacyWallTypes[number];
type WallType = typeof modernWallTypes[number];

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
const appliedWall = z.object({
    areaInputs: areaInputsSchema.optional(),
    l: stringyFloatSchema.default('' as const),
    h: stringyFloatSchema.default('' as const),
    windowarea: z.number().optional(),
    netarea: z.number().optional(),
    wk: z.number().optional(),
});
const wallMeasure = z.object({
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
const appliedWallLikeElement = commonLibraryElement
    .merge(commonWall)
    .merge(appliedWall)
    .merge(commonAppliedElement);
const appliedWallLikeMeasure = commonAppliedMeasure
    .merge(commonWall)
    .merge(appliedWall)
    .merge(wallMeasure);
const libraryWallLikeMeasure = zodPredicateUnion([
    {
        name: 'type stored in type',
        predicate: (val) => isIndexable(val) && 'type' in val,
        schema: commonLibraryElement
            .merge(commonWall)
            .merge(commonLibraryMeasure)
            .merge(wallMeasure),
    },
    // This is not even a 'legacy' format - just for some reason some measures don't
    // have the 'type' field filled in properly, but in every case we can get it from
    // 'tags'.
    {
        name: 'type stored in tags',
        predicate: (val) => isIndexable(val) && !('type' in val),
        schema: commonLibraryElement
            .merge(commonLibraryMeasure)
            .merge(wallMeasure)
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
export type AppliedWall =
    | z.infer<typeof appliedWallLikeElement>
    | z.infer<typeof appliedWallLikeMeasure>;

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
const appliedOpening = z.object({
    l: stringyFloatSchema,
    h: stringyFloatSchema,
    orientation: stringyIntegerSchema,
    overshading: stringyIntegerSchema,
    subtractfrom: subtractFrom,
});
const appliedOpeningElement = commonLibraryElement
    .merge(commonAppliedElement)
    .merge(commonOpening)
    .merge(appliedOpening);
const appliedOpeningMeasure = commonAppliedMeasure
    .merge(commonOpening)
    .merge(appliedOpening);
const libraryOpeningMeasure = commonLibraryElement
    .merge(commonLibraryMeasure)
    .merge(commonOpening);

const commonHatch = z.object({
    type: z.enum(['hatch', 'Hatch']).transform(() => 'hatch' as const),
});
const appliedHatch = z.object({
    subtractfrom: subtractFrom,
    l: stringyFloatSchema,
    h: stringyFloatSchema,
});
const appliedHatchElement = commonLibraryElement
    .merge(commonAppliedElement)
    .merge(commonHatch)
    .merge(appliedHatch);
const appliedHatchMeasure = commonAppliedMeasure.merge(commonHatch).merge(appliedHatch);
const libraryHatchMeasure = commonLibraryElement
    .merge(commonLibraryMeasure)
    .merge(commonHatch);

const commonFloor = z.object({
    type: z.enum(['floor', 'Floor']).transform(() => 'floor' as const),
});
const appliedFloor = z.object({
    // `perimeter` should one day be renamed to `exposedPerimeter` (or
    // something) and go in the per floor type spec, but for now we keep it
    // here because legacy JS references it
    perimeter: stringyFloatSchema.optional(),
    selectedFloorType: floorType.optional(),
    perFloorTypeSpec: perFloorTypeSpecSchema.optional(),

    // Output fields
    wk: stringyFloatSchema.optional(),
});

const appliedFloorElement = commonLibraryElement
    .merge(commonAppliedElement)
    .merge(commonFloor)
    .merge(appliedFloor);
const appliedFloorMeasure = commonAppliedMeasure.merge(commonFloor).merge(appliedFloor);
const libraryFloorMeasure = commonLibraryElement
    .merge(commonLibraryMeasure)
    .merge(commonFloor);
export const floorSchema = appliedFloorElement;
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
        schema: z.union([appliedWallLikeMeasure, appliedWallLikeElement]),
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
        schema: z.union([appliedOpeningMeasure, appliedOpeningElement]),
    },
    {
        predicate: typeFieldMatches(['hatch', 'Hatch']),
        schema: z.union([appliedHatchMeasure, appliedHatchElement]),
    },
    {
        predicate: typeFieldMatches(['floor', 'Floor']),
        schema: z.union([appliedFloorMeasure, appliedFloorElement]),
    },
]);
export type FabricElement = z.infer<typeof fabricElement>;

export function isWallLike(element: FabricElement): element is AppliedWall {
    return (
        element.type === 'external wall' ||
        element.type === 'party wall' ||
        element.type === 'loft' ||
        element.type === 'roof'
    );
}

export const libraryMeasure = zodPredicateUnion([
    {
        predicate: typeFieldMatches([...legacyWallTypes, ...modernWallTypes]),
        schema: libraryWallLikeMeasure,
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
        schema: libraryOpeningMeasure,
    },
    {
        predicate: typeFieldMatches(['hatch', 'Hatch']),
        schema: libraryHatchMeasure,
    },
    {
        predicate: typeFieldMatches(['floor', 'Floor']),
        schema: libraryFloorMeasure,
    },
]);

export const fabric = z.object({
    elements: z.array(fabricElement).optional(),
    measures: z
        .record(
            z.object({
                measure: libraryMeasure,
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
