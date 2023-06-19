import { z } from 'zod';

import { isIndexable } from '../../../helpers/is-indexable';
import { NonEmptyArray } from '../../../helpers/non-empty-array';
import { initialPerFloorTypeSpec } from '../../../ui/modules/floor-row/u-value-calculator/state';
import { zodNonEmptyArray } from '../../helpers/non-empty-array';
import { proportionSchema } from '../../helpers/proportion';
import { zodPredicateUnion } from '../../helpers/zod-predicate-union';
import { floorInsulationMaterialItem } from '../../libraries/floor-insulation';

const insulationSpecSchema = z.object({
    thickness: z.number().nullable(),
    material: floorInsulationMaterialItem.nullable(),
});
export type InsulationSpec = z.infer<typeof insulationSpecSchema>;

const solidFloorTablesSpecSchema = z.object({
    allOverInsulation: insulationSpecSchema.extend({
        enabled: z.boolean(),
    }),
    edgeInsulation: z.object({
        selected: z.enum(['horizontal', 'vertical']).nullable(),
        vertical: insulationSpecSchema.extend({
            depth: z.number().nullable(),
        }),
        horizontal: insulationSpecSchema.extend({
            width: z.number().nullable(),
        }),
    }),
});
export type SolidFloorTablesSpec = z.infer<typeof solidFloorTablesSpecSchema>;

const floorLayerSpecSchema = z.object({
    thickness: z.number().nullable(),
    mainMaterial: floorInsulationMaterialItem.nullable(),
    bridging: z.object({
        material: floorInsulationMaterialItem.nullable(),
        proportion: proportionSchema.nullable(),
    }),
});
export type FloorLayerSpec = z.infer<typeof floorLayerSpecSchema>;

const solidFloorBs13370SpecSchema = z.object({
    wallThickness: z.number().nullable(),
    layers: zodNonEmptyArray(floorLayerSpecSchema),
    groundConductivity: z.object({
        groundType: z.enum([
            'clay or silt',
            'sand or gravel',
            'homogenous rock',
            'unknown',
            'custom',
        ]),
        customValue: z.number().nullable(),
    }),
    edgeInsulation: z.object({
        selected: z.enum(['horizontal', 'vertical']).nullable(),
        vertical: insulationSpecSchema.extend({
            depth: z.number().nullable(),
        }),
        horizontal: insulationSpecSchema.extend({
            width: z.number().nullable(),
        }),
    }),
});
export type SolidFloorBS13370Spec = z.infer<typeof solidFloorBs13370SpecSchema>;

const suspendedFloorV1SpecSchema = z.object({
    ventilationCombinedArea: z.number().nullable(),
    underFloorSpacePerimeter: z.number().nullable(),
    insulation: z.object({
        enabled: z.boolean(),
        layers: zodNonEmptyArray(floorLayerSpecSchema),
    }),
});
const suspendedFloorV2SpecSchema = z.object({
    version: z.literal(2),
    ventilationCombinedArea: z.number().nullable(),
    underFloorSpacePerimeter: z.number().nullable(),
    layers: zodNonEmptyArray(floorLayerSpecSchema),
});
const suspendedFloorSpecSchema = zodPredicateUnion([
    {
        name: 'v1',
        predicate: (spec) => isIndexable(spec) && !('version' in spec),
        schema: suspendedFloorV1SpecSchema.transform(
            ({
                ventilationCombinedArea,
                underFloorSpacePerimeter,
                insulation,
            }): z.infer<typeof suspendedFloorV2SpecSchema> => ({
                version: 2,
                ventilationCombinedArea,
                underFloorSpacePerimeter,
                layers: insulation.layers,
            }),
        ),
    },
    {
        name: 'v2',
        predicate: (spec) => isIndexable(spec) && spec['version'] === 2,
        schema: suspendedFloorV2SpecSchema,
    },
]);
export type SuspendedFloorSpec = z.infer<typeof suspendedFloorSpecSchema>;

const heatedBasementFloorSpecSchema = z.object({
    basementDepth: z.number().nullable(),
    insulation: insulationSpecSchema.extend({
        enabled: z.boolean(),
    }),
});
export type HeatedBasementFloorSpec = z.infer<typeof heatedBasementFloorSpecSchema>;

const exposedFloorV1SpecSchema = z.object({
    exposedTo: z.enum(['outside air', 'unheated space']).nullable(),
    insulation: z.object({
        enabled: z.boolean(),
        layers: zodNonEmptyArray(floorLayerSpecSchema),
    }),
});
const exposedFloorV2SpecSchema = z.object({
    version: z.literal(2),
    exposedTo: z.enum(['outside air', 'unheated space']).nullable(),
    layers: zodNonEmptyArray(floorLayerSpecSchema),
});
const exposedFloorSpecSchema = zodPredicateUnion([
    {
        name: 'v1',
        predicate: (spec) => isIndexable(spec) && !('version' in spec),
        schema: exposedFloorV1SpecSchema.transform(
            ({ exposedTo, insulation }): z.infer<typeof exposedFloorV2SpecSchema> => ({
                version: 2,
                exposedTo,
                layers: insulation.layers,
            }),
        ),
    },
    {
        name: 'v2',
        predicate: (spec) => isIndexable(spec) && spec['version'] === 2,
        schema: exposedFloorV2SpecSchema,
    },
]);
export type ExposedFloorSpec = z.infer<typeof exposedFloorSpecSchema>;

const customFloorSpecSchema = z.object({
    uValue: z.number().nullable(),
});
export type CustomFloorSpec = z.infer<typeof customFloorSpecSchema>;

const combinedFloorTypeSpecs = {
    custom: customFloorSpecSchema,
    solid: solidFloorTablesSpecSchema,
    ['solid (bs13370)']: solidFloorBs13370SpecSchema.default(
        initialPerFloorTypeSpec['solid (bs13370)'],
    ),
    suspended: suspendedFloorSpecSchema,
    'heated basement': heatedBasementFloorSpecSchema,
    exposed: exposedFloorSpecSchema,
};
export const floorType = z.enum(
    // SAFETY: `FloorType` is guaranteed to fully describe all the keys in
    // `combinedFloorTypeSpecs`, because `combiendFloorTypeSpecs` is a constant
    // with an inferred type. (See
    // https://stackoverflow.com/questions/55012174/why-doesnt-object-keys-return-a-keyof-type-in-typescript
    // for why this is not always the case).
    // We also can see by inspection that the keys are a non-empty array.
    //
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    Object.keys(combinedFloorTypeSpecs) as NonEmptyArray<
        keyof typeof combinedFloorTypeSpecs
    >,
);
export type FloorType = z.infer<typeof floorType>;
export const perFloorTypeSpecSchema = z.object(combinedFloorTypeSpecs);
export type PerFloorTypeSpec = z.infer<typeof perFloorTypeSpecSchema>;
