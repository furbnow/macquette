import { FloorInsulationMaterial } from '../../../../data-schemas/libraries/floor-insulation';
import { NonEmptyArray } from '../../../../helpers/non-empty-array';
import { Proportion } from '../../../../helpers/proportion';

export type InsulationInput = {
    thickness: number;
    material: FloorInsulationMaterial;
};
export type FloorLayerInput = {
    thickness: number;
    mainMaterial: FloorInsulationMaterial;
    bridging: null | {
        material: FloorInsulationMaterial;
        proportion: Proportion;
    };
};

export type CustomFloorInput = {
    floorType: 'custom';
    uValue: number;
};
export type SolidFloorInput = {
    floorType: 'solid';
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
    insulationLayers: null | NonEmptyArray<FloorLayerInput>;
};
export type HeatedBasementFloorInput = {
    floorType: 'heated basement';
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
    exposedPerimeter: number;
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
