import { z } from 'zod';

import type { Library } from '.';
import { isIndexable } from '../../helpers/is-indexable';
import { Result } from '../../helpers/result';
import { zodPredicateUnion } from '../helpers/zod-predicate-union';
import { zodUnwrapResult } from '../helpers/zod-unwrap-result';
import { libraryItemCommonSchema, makeLibrarySchema, withGenericTags } from './common';

const floorInsulationConductivityMaterialItem = z
    .object({
        mechanism: z
            .enum(['', 'conductivity'])
            .nullable()
            .optional()
            .transform(() => 'conductivity' as const),
        conductivity: z.union([
            z.number(),
            zodUnwrapResult(z.string().transform(parseFloatResult)),
        ]),
        type: z.string().optional(),
        tag: z.string(),
        description: z.string(),
    })
    .merge(libraryItemCommonSchema.omit({ tag: true }))
    .merge(withGenericTags);
export type FloorInsulationConductivityMaterial = z.infer<
    typeof floorInsulationConductivityMaterialItem
>;
const floorInsulationResistanceMaterialItem = z
    .object({
        mechanism: z.literal('resistance' as const),
        resistance: z.union([
            z.number(),
            zodUnwrapResult(z.string().transform(parseFloatResult)),
        ]),
        type: z.string().optional(),
        tag: z.string(),
        description: z.string(),
    })
    .merge(libraryItemCommonSchema.omit({ tag: true }))
    .merge(withGenericTags);
export type FloorInsulationResistanceMaterial = z.infer<
    typeof floorInsulationResistanceMaterialItem
>;
export const floorInsulationMaterialItem = zodPredicateUnion([
    {
        name: 'conductivity',
        predicate: (val) =>
            isIndexable(val) &&
            new Array<unknown>('conductivity', '', null, undefined).includes(
                val['mechanism'],
            ),
        schema: floorInsulationConductivityMaterialItem,
    },
    {
        name: 'resistance',
        predicate: (val) => isIndexable(val) && val['mechanism'] === 'resistance',
        schema: floorInsulationResistanceMaterialItem,
    },
]);
export type FloorInsulationMaterial = z.infer<typeof floorInsulationMaterialItem>;

export type FloorInsulationMaterialLibrary = z.infer<typeof floorInsulation>;
export const floorInsulation = makeLibrarySchema(
    'floor_insulation_materials',
    floorInsulationMaterialItem,
);
export function isFloorInsulationMaterialLibrary(
    l: Library,
): l is FloorInsulationMaterialLibrary {
    return l.type === 'floor_insulation_materials';
}

function parseFloatResult(str: string): Result<number, string> {
    const parsed = parseFloat(str);
    if (Number.isNaN(parsed)) {
        return Result.err('not a number');
    } else {
        return Result.ok(parsed);
    }
}
