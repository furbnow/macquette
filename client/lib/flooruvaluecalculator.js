//link to docs!
//https://carboncoop.gitlab.io/macquette/...

import { C1, C2, C3, C4, C5 } from '../data/flooruvaluecalculator/tables';
import { insulationMaterials } from '../data/flooruvaluecalculator/insulationmaterials'

function calculateResistance(thickness, conductivity) {
    if (thickness === null || conductivity === '') {
        return 0
    }
    const conductivity_val = insulationMaterials
        .filter(x => x.value === conductivity)[0]['conductivity']
    return thickness / conductivity_val
}

export function findNearestIndex(arr, val) {
    let arrMinusVal = [];
    for (let i = 0; i < arr.length; i++) {
        arrMinusVal.push(Math.abs(arr[i] - val));
    }
    const minVal = Math.min(...arrMinusVal);
    const minIdx = arrMinusVal.indexOf(minVal);
    return minIdx;
}

export function lookupUValue(table, x, y) {
    if (x === null || x === '' || isNaN(y)) {
        return;
    }

    const matrix = table['matrix'];
    const X = table['X'];
    const Y = table['Y'];

    const X_idx = findNearestIndex(X, x);
    const Y_idx = findNearestIndex(Y, y);

    return matrix[Y_idx][X_idx];
}

function calculateSolidGroundFloor(perimeter_area_ratio, resistance_floor, edge_insulation_type, horizontal_edge_insulation, vertical_edge_insulation) {
    const U_0 = lookupUValue(C1, resistance_floor, perimeter_area_ratio);

    function calculatePsi() {
        let [resistance_horizontal, resistance_vertical] = [0, 0]

        switch (edge_insulation_type) {
            case 'horizontal':
                resistance_horizontal = calculateResistance(horizontal_edge_insulation.thickness, horizontal_edge_insulation.conductivity)
                return lookupUValue(C2, resistance_horizontal, horizontal_edge_insulation.width)
            case 'vertical':
                resistance_vertical = calculateResistance(vertical_edge_insulation.thickness, vertical_edge_insulation.conductivity)
                return lookupUValue(C3, resistance_vertical, vertical_edge_insulation.depth)
            case 'none':
                return 0
        }
    }

    return U_0 - perimeter_area_ratio * calculatePsi();
}

function calculateSuspendedFloor(ventilation, perimeter_area_ratio) {
    return lookupUValue(C4, ventilation, perimeter_area_ratio);
}

function calculateBasementFloor(basement_depth, perimeter_area_ratio, resistance_floor) {
    const U_uninsulated = lookupUValue(C5, basement_depth, perimeter_area_ratio)
    return (U_uninsulated ** -1 + resistance_floor) ** -1
}

export default function calculate(inputs) {
    const perimeter_area_ratio = inputs.perimeter / inputs.area
    const resistance_floor = inputs.floor_insulation.hasInsulation
        ? calculateResistance(inputs.floor_insulation.thickness, inputs.floor_insulation.conductivity)
        : 0

    switch (inputs.floor_type) {
        case 'SOLID_GROUND_FLOOR':
            return calculateSolidGroundFloor(perimeter_area_ratio, resistance_floor, inputs.edge_insulation_type, inputs.horizontal_edge_insulation, inputs.vertical_edge_insulation);
        case 'SUSPENDED_FLOOR':
            return calculateSuspendedFloor(inputs.ventilation, perimeter_area_ratio);
        case 'BASEMENT_FLOOR':
            return calculateBasementFloor(inputs.basement_depth, perimeter_area_ratio, resistance_floor);
    }
}
