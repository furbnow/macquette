import type {
  FloorLayerSpec,
  InsulationSpec,
} from '../../../../../data-schemas/scenario/fabric/floor-u-value';
import { NonEmptyArray } from '../../../../../helpers/non-empty-array';

const nullInsulation: InsulationSpec = { thickness: null, material: null };
const initialCombinedMethodLayers: NonEmptyArray<FloorLayerSpec> = [
  {
    thickness: null,
    mainMaterial: null,
    bridging: { material: null, proportion: null },
  },
];

export const initialPerFloorTypeSpec = {
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
  'solid (bs13370)': {
    edgeInsulation: {
      selected: null,
      vertical: { ...nullInsulation, depth: null, thickness: null },
      horizontal: { ...nullInsulation, width: null, thickness: null },
    },
    layers: initialCombinedMethodLayers,
    wallThickness: null,
    groundConductivity: {
      groundType: 'unknown' as const,
      customValue: null,
    },
  },
  suspended: {
    version: 2 as const,
    ventilationCombinedArea: null,
    underFloorSpacePerimeter: null,
    layers: initialCombinedMethodLayers,
  },
  'heated basement': {
    basementDepth: null,
    insulation: { ...nullInsulation, enabled: false },
  },
  exposed: {
    version: 2 as const,
    exposedTo: null,
    layers: initialCombinedMethodLayers,
  },
};
