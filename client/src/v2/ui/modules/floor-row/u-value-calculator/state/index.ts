import {
    FloorLayerSpec,
    InsulationSpec,
    PerFloorTypeSpec,
} from '../../../../../data-schemas/scenario/fabric/floor-u-value';
import { NonEmptyArray } from '../../../../../helpers/non-empty-array';

export function initialPerFloorTypeSpec(): PerFloorTypeSpec {
    const nullInsulation: InsulationSpec = { thickness: null, material: null };
    const initialCombinedMethodLayers: NonEmptyArray<FloorLayerSpec> = [
        {
            thickness: null,
            mainMaterial: null,
            bridging: { material: null, proportion: null },
        },
    ];
    return {
        custom: {
            uValue: null,
        },
        solid: {
            allOverInsulation: { ...nullInsulation, enabled: false },
            edgeInsulation: {
                selected: null,
                vertical: { ...nullInsulation, depth: null },
                horizontal: { ...nullInsulation, width: null },
            },
        },
        suspended: {
            ventilationCombinedArea: null,
            underFloorSpacePerimeter: null,
            insulation: {
                enabled: false,
                layers: initialCombinedMethodLayers,
            },
        },
        'heated basement': {
            basementDepth: null,
            insulation: { ...nullInsulation, enabled: false },
        },
        exposed: {
            exposedTo: null,
            insulation: {
                enabled: false,
                layers: initialCombinedMethodLayers,
            },
        },
    };
}
