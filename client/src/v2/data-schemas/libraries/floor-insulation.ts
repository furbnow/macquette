import { z } from 'zod';

import type { Library } from '.';
import { Result } from '../../helpers/result';
import { zodUnwrapResult } from '../helpers/zod-unwrap-result';
import { libraryItemCommonSchema, makeLibrarySchema, withGenericTags } from './common';

export const floorInsulationMaterialItem = z
    .object({
        conductivity: z.union([
            z.number(),
            zodUnwrapResult(z.string().transform(parseFloatResult)),
        ]),
        type: z.string().optional(),
        tag: z.string(),
        description: z.string(),
    })
    .merge(libraryItemCommonSchema.omit({ tag: true }))
    .merge(withGenericTags)
    .passthrough();
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
