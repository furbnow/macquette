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
    FloorUValueWarning,
} from '../../../../data-schemas/scenario/fabric/floor-u-value';
import {
    RequiredValueMissingError,
    ValuePath,
} from '../../../../data-schemas/scenario/validation';
import { assertNever } from '../../../../helpers/assert-never';
import { withPathPrefix } from '../../../../helpers/error-warning-path';
import { assertNonEmpty, NonEmptyArray } from '../../../../helpers/non-empty-array';
import { Result } from '../../../../helpers/result';
import { WarningCollector, WithWarnings } from '../../../../helpers/with-warnings';
import { FloorLayerInput } from './floor-layer-input';
import {
    CustomFloorInput,
    ExposedFloorInput,
    FloorUValueModelInput,
    HeatedBasementFloorInput,
    InsulationInput,
    SolidFloorInput,
    SuspendedFloorInput,
} from './input-types';

type FloorUValueValidationResultWithWarnings<T> = WithWarnings<
    Result<T, RequiredValueMissingError>,
    FloorUValueWarning
>;
type FUVCResult<T> = FloorUValueValidationResultWithWarnings<T>;

function valueMissingError(
    path: ValuePath,
): WithWarnings<Result<never, RequiredValueMissingError>, never> {
    return WithWarnings.empty(
        Result.err({
            type: 'required value missing error' as const,
            namespace: 'floor u-value calculator',
            path,
        }),
    );
}

export function validate(
    selectedFloorType: FloorType,
    common: FloorUValueModelInput['common'],
    spec: PerFloorTypeSpec,
): FUVCResult<FloorUValueModelInput> {
    return validatePerFloorType(selectedFloorType, spec).map((res) =>
        res.map((perFloorType) => ({
            common,
            perFloorType,
        })),
    );
}

function validatePerFloorType(
    selectedFloorType: FloorType,
    spec: PerFloorTypeSpec,
): FUVCResult<FloorUValueModelInput['perFloorType']> {
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

function validateCustomFloor(spec: CustomFloorSpec): FUVCResult<CustomFloorInput> {
    const { uValue } = spec;
    if (uValue === null) {
        return valueMissingError(['custom', 'uValue']);
    } else {
        return WithWarnings.empty(Result.ok({ floorType: 'custom', uValue }));
    }
}

function validateSolidFloor(spec: SolidFloorSpec): FUVCResult<SolidFloorInput> {
    const wc = new WarningCollector<FloorUValueWarning>();
    let allOverInsulation: SolidFloorInput['allOverInsulation'];
    if (!spec.allOverInsulation.enabled) {
        allOverInsulation = null;
    } else {
        const res = withPathPrefix(
            ['solid', 'all-over-insulation'],
            validateInsulation(spec.allOverInsulation),
        ).unwrap(wc.sink());
        if (res.isErr()) {
            return wc.out(res);
        }
        allOverInsulation = res.unwrap();
    }
    let edgeInsulation: SolidFloorInput['edgeInsulation'];
    switch (spec.edgeInsulation.selected) {
        case null:
            edgeInsulation = { type: 'none' };
            break;
        case 'vertical': {
            const res = withPathPrefix(
                ['solid', 'edge-insulation', 'vertical'],
                validateInsulation(spec.edgeInsulation.vertical),
            ).unwrap(wc.sink());
            if (res.isErr()) {
                return wc.out(res);
            }
            const verticalInsulation = res.unwrap();
            const { depth } = verticalInsulation;
            if (depth === null) {
                return valueMissingError([
                    'solid',
                    'edge-insulation',
                    'vertical',
                    'depth',
                ]);
            }
            edgeInsulation = {
                type: 'vertical',
                ...verticalInsulation,
                depth,
            };
            break;
        }
        case 'horizontal': {
            const res = withPathPrefix(
                ['solid', 'edge-insulation', 'horizontal'],
                validateInsulation(spec.edgeInsulation.horizontal),
            ).unwrap(wc.sink());
            if (res.isErr()) {
                return wc.out(res);
            }
            const horizontalInsulation = res.unwrap();
            const { width } = horizontalInsulation;
            if (width === null) {
                return valueMissingError([
                    'solid',
                    'edge-insulation',
                    'horizontal',
                    'width',
                ]);
            }
            edgeInsulation = {
                type: 'horizontal',
                ...horizontalInsulation,
                width,
            };
            break;
        }
    }
    return WithWarnings.empty(
        Result.ok({
            ...spec,
            floorType: 'solid',
            allOverInsulation,
            edgeInsulation,
        }),
    );
}

function validateCombinedMethodLayers(
    layersSpec: NonEmptyArray<FloorLayerSpec>,
): FUVCResult<NonEmptyArray<FloorLayerInput>> {
    const wc = new WarningCollector<FloorUValueWarning>();
    return wc.out(
        Result.mapArray<FloorLayerSpec, FloorLayerInput, RequiredValueMissingError>(
            layersSpec,
            (spec, index) =>
                withPathPrefix(
                    ['combined-method-layers', index],
                    FloorLayerInput.validate(spec),
                ).unwrap(wc.sink()),
        ).map(assertNonEmpty),
    );
}

function validateSuspendedFloor(
    spec: SuspendedFloorSpec,
): FUVCResult<SuspendedFloorInput> {
    const wc = new WarningCollector<FloorUValueWarning>();
    const { ventilationCombinedArea, underFloorSpacePerimeter } = spec;
    if (ventilationCombinedArea === null) {
        return valueMissingError(['suspended', 'ventilation-combined-area']);
    }
    if (underFloorSpacePerimeter === null) {
        return valueMissingError(['suspended', 'under-floor-space-perimeter']);
    }
    const layersR = withPathPrefix(
        ['suspended'],
        validateCombinedMethodLayers(spec.layers),
    );
    return wc.out(
        layersR.unwrap(wc.sink()).map((layers) => ({
            floorType: 'suspended',
            ventilationCombinedArea,
            underFloorSpacePerimeter,
            layers,
        })),
    );
}

function validateHeatedBasementFloor(
    spec: HeatedBasementFloorSpec,
): FUVCResult<HeatedBasementFloorInput> {
    const wc = new WarningCollector<FloorUValueWarning>();
    const { basementDepth } = spec;
    if (basementDepth === null) {
        return valueMissingError(['heated-basement', 'depth']);
    }
    if (!spec.insulation.enabled) {
        return WithWarnings.empty(
            Result.ok({
                floorType: 'heated basement',
                basementDepth,
                insulation: null,
            }),
        );
    }
    const res = withPathPrefix(
        ['heated-basement'],
        validateInsulation(spec.insulation),
    ).unwrap(wc.sink());
    if (res.isErr()) {
        return wc.out(res);
    }
    const insulation = res.unwrap();
    return WithWarnings.empty(
        Result.ok({
            floorType: 'heated basement',
            basementDepth,
            insulation,
        }),
    );
}

function validateExposedFloor(spec: ExposedFloorSpec): FUVCResult<ExposedFloorInput> {
    const wc = new WarningCollector<FloorUValueWarning>();
    const { exposedTo } = spec;
    if (exposedTo === null) {
        return valueMissingError(['exposed', 'exposed-to']);
    }
    const layersR: FUVCResult<ExposedFloorInput['layers']> = withPathPrefix(
        ['exposed'],
        validateCombinedMethodLayers(spec.layers),
    );
    return wc.out(
        layersR.unwrap(wc.sink()).map((layers) => ({
            floorType: 'exposed',
            exposedTo,
            layers,
        })),
    );
}

function validateInsulation<T extends InsulationSpec>(
    spec: T,
): FUVCResult<T & InsulationInput> {
    const { thickness, material } = spec;
    if (material === null) {
        return valueMissingError(['insulation', 'material']);
    }
    if (material.mechanism === 'conductivity') {
        if (thickness === null) {
            return valueMissingError(['insulation', 'thickness']);
        }
        return WithWarnings.empty(
            Result.ok({ ...spec, mechanism: 'conductivity', thickness, material }),
        );
    } else if (material.mechanism === 'resistance') {
        return WithWarnings.empty(
            Result.ok({ ...spec, mechanism: 'resistance', material }),
        );
    } else {
        return assertNever(material);
    }
}
