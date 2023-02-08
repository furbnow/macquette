import {
    FloorUValueWarning,
    ParameterClampWarning,
    RequiredValueMissingError,
    UnnecessaryValueWarning,
} from '../../../../model/modules/fabric/floor-u-value-calculator/warnings';

export function warningDisplay(warning: FloorUValueWarning): string | null {
    switch (warning.type) {
        case 'parameter clamped':
            return parameterClamped(warning);
        case 'unnecessary value':
            return unnecessaryValueWarning(warning);
        case 'non-finite number replaced':
            return 'The calculation returned a non-finite number (Infinity, -Infinity or NaN). This is caused by an arithmetic error such as a division by zero.';
        case 'required value missing':
            return missingValueWarning(warning);
        default:
            return null;
    }
}

function parameterClamped(warning: ParameterClampWarning): string | null {
    const { value } = warning;
    const boundary = (value ?? NaN) >= warning.clampedTo ? 'maximum' : 'minimum';
    const boundaryValue = warning.clampedTo;
    function standardClampedFormat(humanName: string, unit?: string) {
        const unitDisplay = unit === undefined ? '' : ' ' + unit;
        return `${humanName} was ${
            value ?? 'null'
        }${unitDisplay}, which is outside the ${boundary}. The value was clamped to ${boundaryValue}${unitDisplay}`;
    }
    const stringPath = warning.path.join('.');
    switch (stringPath) {
        case 'solid (tables).perimeter-area-ratio': {
            return standardClampedFormat('Ratio of exposed perimeter to area', 'm/m²');
        }
        case 'solid (tables).all-over-insulation.resistance': {
            return standardClampedFormat('All-over insulation resistance', 'm²K/W');
        }
        case 'solid (tables).horizontal-insulation.width': {
            return standardClampedFormat('Horizontal insulation width', 'm');
        }
        case 'solid (tables).horizontal-insulation.resistance': {
            return standardClampedFormat('Horizontal insulation resistance', 'm²K/W');
        }
        case 'solid (tables).vertical-insulation.depth': {
            return standardClampedFormat('Vertical insulation depth', 'm');
        }
        case 'solid (tables).vertical-insulation.resistance': {
            return standardClampedFormat('Vertical insulation resistance', 'm²K/W');
        }
        case 'suspended.perimeter-area-ratio': {
            return standardClampedFormat('Ratio of underfloor perimeter to area', 'm/m²');
        }
        case 'suspended.under-floor-ventilation-perimeter-ratio': {
            return standardClampedFormat(
                'Ratio of ventilation area to underfloor space perimeter',
                'm²/m',
            );
        }
        case 'heated-basement.perimeter-area-ratio': {
            return standardClampedFormat('Ratio of exposed perimeter to area', 'm/m²');
        }
        case 'heated-basement.depth': {
            return standardClampedFormat('Heated basement depth', 'm');
        }
    }
    return null;
}

function computeCombinedMethodStuff(warning: FloorUValueWarning): {
    prefix: string;
    remainingPath: (string | number)[];
} | null {
    const path = [...warning.path];
    const floorType = path.shift();
    let floorTypeDisplay: string;
    switch (floorType) {
        case 'exposed':
            floorTypeDisplay = 'Exposed floor';
            break;
        case 'suspended':
            floorTypeDisplay = 'Suspended floor';
            break;
        case 'solid (bs13370)':
            floorTypeDisplay = 'Solid floor';
            break;
        default:
            return null;
    }
    if (path.shift() !== 'combined-method-layers') {
        return null;
    }
    const layerIndex0 = path.shift();
    if (typeof layerIndex0 !== 'number') {
        return null;
    }
    const layerIndex1 = layerIndex0 + 1;
    const prefix = `${floorTypeDisplay} layer ${layerIndex1}`;
    return {
        prefix,
        remainingPath: path,
    };
}

function unnecessaryValueWarning(warning: UnnecessaryValueWarning): string | null {
    const path = [...warning.path];
    if (path.shift() !== 'floor' || path.shift() !== 'u-value-validation') {
        return null;
    }
    if (path[1] !== 'combined-method-layers') {
        return null;
    }
    const combinedMethodStuff = computeCombinedMethodStuff({ ...warning, path });
    if (combinedMethodStuff === null) return null;
    const { prefix, remainingPath } = combinedMethodStuff;
    const stringPath = remainingPath.join('.');
    switch (stringPath) {
        case 'floor-layer-input.thickness':
            return `${prefix}: Element(s) were resistance-based, but layer thickness was specified. The thickness is not used in this case.`;
    }
    return null;
}

function missingValueWarning(warning: RequiredValueMissingError): string | null {
    const path = [...warning.path];
    if (path.shift() !== 'floor' || path.shift() !== 'u-value-validation') {
        return null;
    }
    if (path[1] === 'combined-method-layers') {
        return combinedMethodMissingValue({ ...warning, path });
    }
    const stringPath = path.join('.');
    switch (stringPath) {
        case 'custom.uValue':
            return 'Must specify U-value';
        case 'solid (tables).all-over-insulation.insulation.thickness':
            return 'Must specify thickness of all-over insulation';
        case 'solid (tables).all-over-insulation.insulation.material':
            return 'Must specify material of all-over insulation';
        case 'solid (tables).edge-insulation.horizontal.insulation.thickness':
        case 'solid (bs13370).edge-insulation.horizontal.thickness':
        case 'solid (bs13370).edge-insulation.horizontal.insulation.thickness':
            return 'Must specify thickness of horizontal edge insulation';
        case 'solid (tables).edge-insulation.horizontal.insulation.material':
        case 'solid (bs13370).edge-insulation.horizontal.insulation.material':
            return 'Must specify material of horizontal edge insulation';
        case 'solid (tables).edge-insulation.horizontal.width':
        case 'solid (bs13370).edge-insulation.horizontal.width':
            return 'Must specify width of horizontal insulation';
        case 'solid (tables).edge-insulation.vertical.insulation.thickness':
        case 'solid (bs13370).edge-insulation.vertical.thickness':
        case 'solid (bs13370).edge-insulation.vertical.insulation.thickness':
            return 'Must specify thickness of vertical edge insulation';
        case 'solid (tables).edge-insulation.vertical.insulation.material':
        case 'solid (bs13370).edge-insulation.vertical.insulation.material':
            return 'Must specify material of vertical edge insulation';
        case 'solid (tables).edge-insulation.vertical.depth':
        case 'solid (bs13370).edge-insulation.vertical.depth':
            return 'Must specify depth of vertical edge insulation';
        case 'solid (bs13370).wall-thickness':
            return 'Must specify wall thickness';
        case 'solid (bs13370).ground-conductivity.custom-value':
            return 'Must specify ground conductivity value if custom is selected';
        case 'suspended.ventilation-combined-area':
            return 'Must specify the combined area of underfloor ventilation points';
        case 'suspended.under-floor-space-perimeter':
            return 'Must specify the perimeter of the underfloor space';
        case 'exposed.exposed-to':
            return 'Must select whether the floor is exposed to outside air or unheated space';
        case 'heated-basement.depth':
            return 'Must specify depth of heated basement';
        case 'heated-basement.insulation.thickness':
            return 'Must specify thickness of heated basement floor insulation';
        case 'heated-basement.insulation.material':
            return 'Must specify material of heated basement floor insulation';
        default:
            return null;
    }
}

function combinedMethodMissingValue(warning: RequiredValueMissingError): string | null {
    const path = [...warning.path];
    const floorType = path.shift();
    let floorTypeDisplay: string;
    switch (floorType) {
        case 'exposed':
            floorTypeDisplay = 'Exposed floor';
            break;
        case 'suspended':
            floorTypeDisplay = 'Suspended floor';
            break;
        case 'solid (bs13370)':
            floorTypeDisplay = 'Solid floor';
            break;
        default:
            return null;
    }
    if (path.shift() !== 'combined-method-layers') {
        return null;
    }
    const layerIndex0 = path.shift();
    if (typeof layerIndex0 !== 'number') {
        return null;
    }
    const layerIndex1 = layerIndex0 + 1;
    if (path.shift() !== 'floor-layer-input') {
        return null;
    }
    const stringPath = path.join('.');
    switch (stringPath) {
        case 'thickness': {
            return `${floorTypeDisplay} layer ${layerIndex1}: Must specify thickness`;
        }
        case 'main-material': {
            return `${floorTypeDisplay} layer ${layerIndex1}: Must specify main material`;
        }
        case 'bridging.proportion': {
            return `${floorTypeDisplay} layer ${layerIndex1}: Must specify bridging proportion if bridging material is selected`;
        }
    }
    return null;
}
