import { z } from 'zod';

import { isIndexable } from '../../../helpers/is-indexable';
import { resultSchema } from '../../helpers/result';
import { withWarningsSchema } from '../../helpers/with-warnings';
import { zodPredicateUnion } from '../../helpers/zod-predicate-union';
import { stringyFloatSchema, stringyIntegerSchema } from '../value-schemas';
import {
    perFloorTypeSpecSchema,
    floorUValueErrorSchema,
    floorUValueWarningSchema,
    floorType,
} from './floor-u-value';

const subtractFrom = z.union([
    z.number(),
    z.literal(null),
    z.literal('no').transform(() => null),
    z.literal(undefined).transform(() => null),
    z.string().transform((s) => parseFloat(s)),
]);
const commonElement = z.object({
    id: z.number(),
    uvalue: stringyFloatSchema,
    kvalue: stringyFloatSchema,
    area: stringyFloatSchema,
    location: z
        .union([z.string(), z.number().transform((n) => n.toString(10))])
        .optional(),
});
const wallLike = commonElement.extend({
    type: z
        .enum([
            'external wall',
            'party wall',
            'loft',
            'roof',
            'Wall',
            'Party_wall',
            'Loft',
            'Roof',
        ])
        .transform((val) => {
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
        }),
    l: stringyFloatSchema,
    h: stringyFloatSchema,
});
const windowLike = commonElement.extend({
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
    subtractfrom: subtractFrom,
    g: stringyFloatSchema,
    gL: stringyFloatSchema,
    ff: stringyFloatSchema,
    l: stringyFloatSchema,
    h: stringyFloatSchema,
    orientation: stringyIntegerSchema,
    overshading: stringyIntegerSchema,
});
const hatch = commonElement.extend({
    type: z.enum(['hatch', 'Hatch']).transform(() => 'hatch' as const),
    subtractfrom: subtractFrom,
    l: stringyFloatSchema,
    h: stringyFloatSchema,
});
const floor = commonElement.extend({
    type: z.enum(['floor', 'Floor']).transform(() => 'floor' as const),
    perimeter: stringyFloatSchema.optional(),
    selectedFloorType: floorType.optional(),
    perFloorTypeSpec: perFloorTypeSpecSchema.optional(),

    // Output fields
    wk: stringyFloatSchema.optional(),
    uValueModelOutput: withWarningsSchema(
        resultSchema(z.number(), floorUValueErrorSchema),
        floorUValueWarningSchema,
    ).optional(),
});

function typeFieldMatches(validTypes: string[]) {
    return (elem: unknown) =>
        isIndexable(elem) &&
        typeof elem['type'] === 'string' &&
        validTypes.includes(elem['type']);
}
export const fabricElement = zodPredicateUnion([
    {
        predicate: typeFieldMatches([
            'external wall',
            'party wall',
            'loft',
            'roof',
            'Wall',
            'Party_wall',
            'Loft',
            'Roof',
        ]),
        schema: wallLike,
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
        schema: windowLike,
    },
    { predicate: typeFieldMatches(['hatch', 'Hatch']), schema: hatch },
    { predicate: typeFieldMatches(['floor', 'Floor']), schema: floor },
]);

export const fabric = z.object({
    elements: z.array(fabricElement).optional(),
    thermal_bridging_yvalue: stringyFloatSchema
        .refine((v) => v !== '', 'empty string is not allowed here')
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        .transform((v) => v as Exclude<typeof v, ''>),
    global_TMP: z
        .union([
            z.boolean(),
            z.literal(1).transform(() => true),
            z.literal(0).transform(() => false),
        ])
        .optional(),
    global_TMP_value: z.number().nullable().optional(),
});

export const floorSchema = floor;
export type Floor = z.infer<typeof floorSchema>;
