import { FloorUValueWarning } from '../../../../data-schemas/scenario/fabric/floor-u-value';
import {
    UnnecessaryValueWarning,
    ValueRangeWarning,
    ZeroDivisionWarning,
} from '../../../../data-schemas/scenario/validation';
import { Result } from '../../../../helpers/result';

export function warningDisplay(warning: FloorUValueWarning): Result<string, null> {
    if (warning.namespace !== 'floor u-value calculator') {
        return Result.err(null);
    }
    if (warning.type === 'value range warning') {
        return valueRangeWarning(warning);
    }
    if (warning.type === 'zero division warning') {
        return zeroDivisionWarning(warning);
    }
    if (warning.type === 'unnecessary value') {
        return unnecessaryValueWarning(warning);
    }
    return Result.err(null);
}

function valueRangeWarning(warning: ValueRangeWarning): Result<string, null> {
    if (warning.resolution.type === 'used as-is') {
        return Result.err(null);
    }
    const { value } = warning;
    const boundary = warning.value >= warning.resolution.to ? 'maximum' : 'minimum';
    const boundaryValue = warning.resolution.to;
    function standardClampedFormat(humanName: string, unit?: string) {
        const unitDisplay = unit === undefined ? '' : ' ' + unit;
        return Result.ok(
            `${humanName} was ${value}${unitDisplay}, which is outside the ${boundary}. The value was clamped to ${boundaryValue}${unitDisplay}`,
        );
    }
    const stringPath = warning.path.join('.');
    switch (stringPath) {
        case 'common.perimeter-area-ratio': {
            return standardClampedFormat('Ratio of exposed perimeter to area', 'm/m²');
        }
        case 'solid.all-over-insulation.resistance': {
            return standardClampedFormat('All-over insulation resistance', 'm²K/W');
        }
        case 'solid.horizontal-insulation.width': {
            return standardClampedFormat('Horizontal insulation width', 'm');
        }
        case 'solid.horizontal-insulation.resistance': {
            return standardClampedFormat('Horizontal insulation resistance', 'm²K/W');
        }
        case 'solid.vertical-insulation.depth': {
            return standardClampedFormat('Vertical insulation depth', 'm');
        }
        case 'solid.vertical-insulation.resistance': {
            return standardClampedFormat('Vertical insulation resistance', 'm²K/W');
        }
        case 'suspended.under-floor-ventilation-perimeter-ratio': {
            return standardClampedFormat(
                'Ratio of ventilation area to underfloor space perimeter',
                'm²/m',
            );
        }
        case 'heated-basement.depth': {
            return standardClampedFormat('Heated basement depth', 'm');
        }
    }
    return Result.err(null);
}

function zeroDivisionStandardFormat(
    warning: ZeroDivisionWarning,
    humanName: string,
    unit?: string,
) {
    const unitDisplay = unit === undefined ? '' : ' ' + unit;
    return Result.ok(
        `${humanName} was not able to be calculated due to a division by zero. The value was taken to be ${warning.outputReplacedWith.toFixed(
            2,
        )}${unitDisplay}.`,
    );
}
function zeroDivisionWarning(warning: ZeroDivisionWarning): Result<string, null> {
    if (warning.path[1] === 'combined-method-layers') {
        return zeroDivisionCombinedMethodWarning(warning);
    }
    const stringPath = warning.path.join('.');
    switch (stringPath) {
        case 'perimeter-area-ratio': {
            return zeroDivisionStandardFormat(warning, 'Perimeter-area ratio');
        }
        case 'solid.all-over-insulation.resistance': {
            return zeroDivisionStandardFormat(
                warning,
                'All-over insulation resistance',
                'm²K/W',
            );
        }
        case 'solid.horizontal-insulation.resistance': {
            return zeroDivisionStandardFormat(
                warning,
                'Horizontal insulation resistance',
                'm²K/W',
            );
        }
        case 'solid.vertical-insulation.resistance': {
            return zeroDivisionStandardFormat(
                warning,
                'Vertical insulation resistance',
                'm²K/W',
            );
        }
        case 'exposed.combined-method-uvalue': {
            return zeroDivisionStandardFormat(
                warning,
                'Combined method raw U-value',
                'W/K.m²',
            );
        }
        case 'suspended.combined-method-resistance': {
            return zeroDivisionStandardFormat(
                warning,
                'Combined method resistance',
                'm²K/W',
            );
        }
        case 'heated-basement.insulation.resistance': {
            return zeroDivisionStandardFormat(
                warning,
                'Heated basement insulation resistance',
                'm²K/W',
            );
        }
    }
    return Result.err(null);
}

function computeCombinedMethodStuff(warning: FloorUValueWarning): Result<
    {
        prefix: string;
        remainingPath: (string | number)[];
    },
    null
> {
    if (warning.namespace !== 'floor u-value calculator') {
        return Result.err(null);
    }
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
        default:
            return Result.err(null);
    }
    if (path.shift() !== 'combined-method-layers') {
        return Result.err(null);
    }
    const layerIndex0 = path.shift();
    if (typeof layerIndex0 !== 'number') {
        return Result.err(null);
    }
    const layerIndex1 = layerIndex0 + 1;
    const prefix = `${floorTypeDisplay} layer ${layerIndex1}`;
    return Result.ok({
        prefix,
        remainingPath: path,
    });
}

function zeroDivisionCombinedMethodWarning(
    warning: ZeroDivisionWarning,
): Result<string, null> {
    if (warning.namespace !== 'floor u-value calculator') {
        return Result.err(null);
    }
    return computeCombinedMethodStuff(warning).chain(({ prefix, remainingPath }) => {
        const stringPath = remainingPath.join('.');
        switch (stringPath) {
            case 'main-material.resistance':
                return zeroDivisionStandardFormat(
                    warning,
                    `${prefix}: Division by zero encountered when calculating main material resistance`,
                );
            case 'bridging-material.resistance':
                return zeroDivisionStandardFormat(
                    warning,
                    `${prefix}: Division by zero encountered when calculating bridging material resistance`,
                );
        }
        return Result.err(null);
    });
}

function unnecessaryValueWarning(warning: UnnecessaryValueWarning): Result<string, null> {
    if (warning.namespace !== 'floor u-value calculator') {
        return Result.err(null);
    }
    if (warning.path[1] !== 'combined-method-layers') {
        return Result.err(null);
    }
    return computeCombinedMethodStuff(warning).chain(({ prefix, remainingPath }) => {
        const stringPath = remainingPath.join('.');
        switch (stringPath) {
            case 'thickness':
                return Result.ok(
                    `${prefix}: Element(s) were resistance-based, but layer thickness was specified. The thickness is not used in this case.`,
                );
        }
        return Result.err(null);
    });
}
