import { FloorInsulationMaterial } from '../../../../data-schemas/libraries/floor-insulation';
import {
    CustomFloorSpec,
    ExposedFloorSpec,
    FloorType,
    FloorLayerSpec,
    HeatedBasementFloorSpec,
    InsulationSpec,
    PerFloorTypeSpec,
    SolidFloorSpec,
    SuspendedFloorSpec,
} from '../../../../data-schemas/scenario/fabric/floor-u-value';
import {
    RequiredValueMissingError,
    ValuePath,
} from '../../../../data-schemas/scenario/validation';
import { assertNonEmpty, NonEmptyArray } from '../../../../helpers/non-empty-array';
import { Result } from '../../../../helpers/result';
import {
    CustomFloorInput,
    ExposedFloorInput,
    FloorLayerInput,
    FloorUValueModelInput,
    HeatedBasementFloorInput,
    SolidFloorInput,
    SuspendedFloorInput,
} from './input-types';

type RVMR<T> = Result<T, RequiredValueMissingError>;
function error(path: ValuePath): Result<never, RequiredValueMissingError> {
    return Result.err({
        type: 'required value missing error' as const,
        namespace: 'floor u-value calculator',
        path,
    });
}

export function validate(
    selectedFloorType: FloorType,
    common: FloorUValueModelInput['common'],
    spec: PerFloorTypeSpec,
): Result<FloorUValueModelInput, RequiredValueMissingError> {
    return validatePerFloorType(selectedFloorType, spec).map((perFloorType) => ({
        common,
        perFloorType,
    }));
}

function validatePerFloorType(
    selectedFloorType: FloorType,
    spec: PerFloorTypeSpec,
): RVMR<FloorUValueModelInput['perFloorType']> {
    switch (selectedFloorType) {
        case 'custom':
            return validateCustomFloor(spec.custom);
        case 'solid':
            return validateSolidFloor(spec.solid);
        case 'suspended':
            return validateSuspendedFloor(spec.suspended);
        case 'heated basement':
            return validateHeatedBasementFloor(spec['heated basement']);
        case 'exposed':
            return validateExposedFloor(spec.exposed);
    }
}

function validateCustomFloor(spec: CustomFloorSpec): RVMR<CustomFloorInput> {
    const { uValue } = spec;
    if (uValue === null) {
        return error(['custom', 'uValue']);
    } else {
        return Result.ok({ floorType: 'custom', uValue });
    }
}

function validateSolidFloor(spec: SolidFloorSpec): RVMR<SolidFloorInput> {
    let allOverInsulation: SolidFloorInput['allOverInsulation'];
    if (!spec.allOverInsulation.enabled) {
        allOverInsulation = null;
    } else {
        const res = validateInsulation(spec.allOverInsulation, [
            'solid',
            'all-over-insulation',
        ]);
        if (res.isErr()) {
            return res;
        }
        allOverInsulation = res.unwrap();
    }
    let edgeInsulation: SolidFloorInput['edgeInsulation'];
    switch (spec.edgeInsulation.selected) {
        case null:
            edgeInsulation = { type: 'none' };
            break;
        case 'vertical': {
            const res = validateInsulation(spec.edgeInsulation.vertical, [
                'solid',
                'edge-insulation',
                'vertical',
            ]);
            if (res.isErr()) {
                return res;
            }
            const verticalInsulation = res.unwrap();
            const { depth } = verticalInsulation;
            if (depth === null) {
                return error(['solid', 'edge-insulation', 'vertical', 'depth']);
            }
            edgeInsulation = {
                type: 'vertical',
                ...verticalInsulation,
                depth,
            };
            break;
        }
        case 'horizontal': {
            const res = validateInsulation(spec.edgeInsulation.horizontal, [
                'solid',
                'edge-insulation',
                'horizontal',
            ]);
            if (res.isErr()) {
                return res;
            }
            const horizontalInsulation = res.unwrap();
            const { width } = horizontalInsulation;
            if (width === null) {
                return error(['solid', 'edge-insulation', 'horizontal', 'width']);
            }
            edgeInsulation = {
                type: 'horizontal',
                ...horizontalInsulation,
                width,
            };
            break;
        }
    }
    return Result.ok({
        ...spec,
        floorType: 'solid',
        allOverInsulation,
        edgeInsulation,
    });
}

function validateCombinedMethodLayers(
    layersSpec: NonEmptyArray<FloorLayerSpec>,
): RVMR<NonEmptyArray<FloorLayerInput>> {
    return Result.mapArray(layersSpec, ({ thickness, mainMaterial, bridging }, index) => {
        function error(pathSuffix: ValuePath) {
            return Result.err({
                type: 'required value missing error' as const,
                namespace: 'floor u-value calculator' as const,
                path: ['combined-method', 'layers', index, ...pathSuffix],
            });
        }
        if (thickness === null) {
            return error(['thickness']);
        }
        if (mainMaterial === null) {
            return error(['main-material']);
        }
        let bridgingInput: FloorLayerInput['bridging'];
        if (bridging.material === null) {
            bridgingInput = null;
        } else if (bridging.proportion === null) {
            // Material was non-null but proportion was null
            return error(['bridging', 'proportion']);
        } else {
            bridgingInput = {
                material: bridging.material,
                proportion: bridging.proportion,
            };
        }
        return Result.ok({
            thickness,
            mainMaterial,
            bridging: bridgingInput,
        });
    }).map(assertNonEmpty);
}

function validateSuspendedFloor(spec: SuspendedFloorSpec): RVMR<SuspendedFloorInput> {
    const { ventilationCombinedArea, underFloorSpacePerimeter } = spec;
    if (ventilationCombinedArea === null) {
        return error(['suspended', 'ventilation-combined-area']);
    }
    if (underFloorSpacePerimeter === null) {
        return error(['suspended', 'under-floor-space-perimeter']);
    }
    let insulationLayersR: RVMR<SuspendedFloorInput['insulationLayers']>;
    if (spec.insulation.enabled) {
        insulationLayersR = validateCombinedMethodLayers(spec.insulation.layers);
    } else {
        insulationLayersR = Result.ok(null);
    }
    return insulationLayersR.map((insulationLayers) => ({
        floorType: 'suspended',
        ventilationCombinedArea,
        underFloorSpacePerimeter,
        insulationLayers,
    }));
}

function validateHeatedBasementFloor(
    spec: HeatedBasementFloorSpec,
): RVMR<HeatedBasementFloorInput> {
    const { basementDepth } = spec;
    if (basementDepth === null) {
        return error(['heated-basement', 'depth']);
    }
    if (!spec.insulation.enabled) {
        return Result.ok({
            floorType: 'heated basement',
            basementDepth,
            insulation: null,
        });
    }
    const res = validateInsulation(spec.insulation, ['heated-basement']);
    if (res.isErr()) {
        return res;
    }
    const insulation = res.unwrap();
    return Result.ok({
        floorType: 'heated basement',
        basementDepth,
        insulation,
    });
}

function validateExposedFloor(spec: ExposedFloorSpec): RVMR<ExposedFloorInput> {
    const { exposedTo } = spec;
    if (exposedTo === null) {
        return error(['exposed', 'exposed-to']);
    }
    const layersR: RVMR<ExposedFloorInput['layers']> = validateCombinedMethodLayers(
        spec.layers,
    );
    return layersR.map((layers) => ({
        floorType: 'exposed',
        exposedTo,
        layers,
    }));
}

function validateInsulation<T extends InsulationSpec>(
    spec: T,
    pathPrefix: ValuePath,
): RVMR<T & { thickness: number; material: FloorInsulationMaterial }> {
    const { thickness, material } = spec;
    if (thickness === null) {
        return error([...pathPrefix, 'insulation', 'thickness']);
    }
    if (material === null) {
        return error([...pathPrefix, 'insulation', 'material']);
    }
    return Result.ok({ ...spec, thickness, material });
}
