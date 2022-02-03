import { z } from 'zod';
import { stringyFloatSchema, stringyIntegerSchema } from './numericValues';

const subtractFrom = z.union([
    z.number(),
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
    type: z.union([
        z.literal('Wall').transform(() => 'external wall' as const),
        z.literal('Party_wall').transform(() => 'party wall' as const),
        z.literal('Loft').transform(() => 'loft' as const),
        z.literal('Roof').transform(() => 'roof' as const),
    ]),
    l: stringyFloatSchema,
    h: stringyFloatSchema,
});
const windowLike = commonElement.extend({
    type: z.union([
        z.literal('Door').transform(() => 'door' as const),
        z.literal('Roof_light').transform(() => 'roof light' as const),
        z.literal('window').transform(() => 'window' as const),
        z.literal('Window').transform(() => 'window' as const),
    ]),
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
    type: z.literal('Hatch').transform(() => 'hatch' as const),
    subtractfrom: subtractFrom,
    l: stringyFloatSchema,
    h: stringyFloatSchema,
});
const floor = commonElement.extend({
    type: z.literal('Floor').transform(() => 'floor' as const),
});

export const fabric = z
    .object({
        elements: z.array(z.union([wallLike, windowLike, hatch, floor])).optional(),
        thermal_bridging_yvalue: stringyFloatSchema
            .refine((v) => v !== null, 'null/empty string is not allowed here')
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            .transform((v) => v!),
        global_TMP: z
            .union([
                z.boolean(),
                z.literal(1).transform(() => true),
                z.literal(0).transform(() => false),
            ])
            .optional(),
        global_TMP_value: z.number().optional(),
    })
    .optional();
