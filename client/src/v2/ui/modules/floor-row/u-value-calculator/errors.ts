import { FloorUValueError } from '../../../../data-schemas/scenario/fabric/floor-u-value';
import { Result } from '../../../../helpers/result';

export function errorDisplay(error: FloorUValueError): Result<string, null> {
    if (error.type !== 'required value missing error') {
        return Result.err(null);
    }
    if (error.namespace !== 'floor u-value calculator') {
        return Result.err(null);
    }
    if (error.path[0] === 'combined-method') {
        return combinedMethodErrorDisplay(error);
    }
    const stringPath = error.path.join('.');
    switch (stringPath) {
        case 'custom.uValue': {
            return Result.ok('Must specify U-value');
        }
        case 'solid.all-over-insulation.insulation.thickness': {
            return Result.ok('Must specify thickness of all-over insulation');
        }
        case 'solid.all-over-insulation.insulation.material': {
            return Result.ok('Must specify material of all-over insulation');
        }
        case 'solid.edge-insulation.horizontal.insulation.thickness': {
            return Result.ok('Must specify thickness of horizontal edge insulation');
        }
        case 'solid.edge-insulation.horizontal.insulation.material': {
            return Result.ok('Must specify material of horizontal edge insulation');
        }
        case 'solid.edge-insulation.horizontal.width': {
            return Result.ok('Must specify width of horizontal insulation');
        }
        case 'solid.edge-insulation.vertical.insulation.thickness': {
            return Result.ok('Must specify thickness of vertical edge insulation');
        }
        case 'solid.edge-insulation.vertical.insulation.material': {
            return Result.ok('Must specify material of vertical edge insulation');
        }
        case 'solid.edge-insulation.vertical.depth': {
            return Result.ok('Must specify depth of vertical edge insulation');
        }
        case 'suspended.ventilation-combined-area': {
            return Result.ok(
                'Must specify the combined area of underfloor ventilation points',
            );
        }
        case 'suspended.under-floor-space-perimeter': {
            return Result.ok('Must specify the perimeter of the underfloor space');
        }
        case 'exposed.exposed-to': {
            return Result.ok(
                'Must select whether the floor is exposed to outside air or unheated space',
            );
        }
        case 'heated-basement.depth': {
            return Result.ok('Must specify depth of heated basement');
        }
        case 'heated-basement.insulation.thickness': {
            return Result.ok(
                'Must specify thickness of heated basement floor insulation',
            );
        }
        case 'heated-basement.insulation.material': {
            return Result.ok('Must specify material of heated basement floor insulation');
        }
    }
    return Result.err(null);
}

function combinedMethodErrorDisplay(error: FloorUValueError): Result<string, null> {
    if (error.type !== 'required value missing error') {
        return Result.err(null);
    }
    if (error.namespace !== 'floor u-value calculator') {
        return Result.err(null);
    }
    const path = [...error.path];
    if (path.shift() !== 'combined-method') {
        return Result.err(null);
    }
    if (path.shift() !== 'layers') {
        return Result.err(null);
    }
    const layerIndex0 = path.shift();
    if (typeof layerIndex0 !== 'number') {
        return Result.err(null);
    }
    const layerIndex1 = layerIndex0 + 1;
    const stringPath = path.join('.');
    switch (stringPath) {
        case 'thickness': {
            return Result.ok(`Layer ${layerIndex1}: Must specify thickness`);
        }
        case 'main-material': {
            return Result.ok(`Layer ${layerIndex1}: Must specify main material`);
        }
        case 'bridging.proportion': {
            return Result.ok(
                `Layer ${layerIndex1}: Must specify bridging proportion if bridging material is selected`,
            );
        }
    }
    return Result.err(null);
}
