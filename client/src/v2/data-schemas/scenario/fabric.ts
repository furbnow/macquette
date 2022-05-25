import { z } from 'zod';

import { stringyFloatSchema, stringyIntegerSchema } from './value-schemas';

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
});

export const fabric = z.object({
    elements: z.array(z.union([wallLike, windowLike, hatch, floor])).optional(),
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
