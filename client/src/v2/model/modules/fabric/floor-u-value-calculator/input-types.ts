import type {
    FloorInsulationConductivityMaterial,
    FloorInsulationResistanceMaterial,
} from '../../../../data-schemas/libraries/floor-insulation';
import type { NonEmptyArray } from '../../../../helpers/non-empty-array';
import type { FloorLayerInput } from './floor-layer-input';

export type InsulationConductivityInput = {
    mechanism: 'conductivity';
    thickness: number;
    material: FloorInsulationConductivityMaterial;
};
export type InsulationResistanceInput = {
    mechanism: 'resistance';
    material: FloorInsulationResistanceMaterial;
};
export type InsulationInput = InsulationConductivityInput | InsulationResistanceInput;

export type CustomFloorInput = {
    floorType: 'custom';
    uValue: number;
};
export type SolidFloorInput = {
    floorType: 'solid';
    exposedPerimeter: number;
    allOverInsulation: null | InsulationInput;
    edgeInsulation:
        | { type: 'none' }
        | ({ type: 'vertical'; depth: number } & InsulationInput)
        | ({ type: 'horizontal'; width: number } & InsulationInput);
};
export type SuspendedFloorInput = {
    floorType: 'suspended';
    ventilationCombinedArea: number;
    underFloorSpacePerimeter: number;
    layers: NonEmptyArray<FloorLayerInput>;
};
export type HeatedBasementFloorInput = {
    floorType: 'heated basement';
    exposedPerimeter: number;
    basementDepth: number;
    insulation: null | InsulationInput;
};
export type ExposedFloorInput = {
    floorType: 'exposed';
    exposedTo: 'outside air' | 'unheated space';
    layers: NonEmptyArray<FloorLayerInput>;
};

export type CommonInput = {
    area: number;
};

export type PerFloorTypeInput =
    | CustomFloorInput
    | SolidFloorInput
    | SuspendedFloorInput
    | HeatedBasementFloorInput
    | ExposedFloorInput;

export type FloorUValueModelInput = {
    common: CommonInput;
    perFloorType: PerFloorTypeInput;
};
