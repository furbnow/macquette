import { FloorUValueWarning } from '../../../../data-schemas/scenario/fabric/floor-u-value';
import { Result } from '../../../../helpers/result';

export function warningDisplay(warning: FloorUValueWarning): Result<string, null> {
    if (warning.type !== 'value range warning') {
        return Result.err(null);
    }
    if (warning.namespace !== 'floor u-value calculator') {
        return Result.err(null);
    }
    if (warning.resolution.type === 'used as-is') {
        return Result.err(null);
    }
    const boundary = warning.value >= warning.resolution.to ? 'maximum' : 'minimum';
    const boundaryValue = warning.resolution.to;
    function standardClampedFormat(humanName: string, unit?: string) {
        const unitDisplay = unit === undefined ? '' : ' ' + unit;
        return Result.ok(
            `${humanName} was ${warning.value}${unitDisplay}, which is outside the ${boundary}. The value was clamped to ${boundaryValue}${unitDisplay}`,
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
