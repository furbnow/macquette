import calculate, { findNearestIndex, lookupUValue } from './flooruvaluecalculator';

describe('findNearestIndex', () => {
    const arr = [-20, -10, 0, 10, 20]

    test('a positive value, within range', () => {
        expect(findNearestIndex(arr, 12)).toBe(3)
    })
    test('a negative value, within range', () => {
        expect(findNearestIndex(arr, -7)).toBe(1)
    })
    test('a big positive value, outside range', () => {
        expect(findNearestIndex(arr, 1e6)).toBe(4)
    })
    test('a big negative value, outside range', () => {
        expect(findNearestIndex(arr, -1e6)).toBe(0)
    })
});


import { C1, C2, C3, C4, C5 } from '../../data/flooruvaluecalculator/tables'
describe('lookupUValue', () => {
    test('C1', () => {
        expect(lookupUValue(C1, 1.5, 0.1)).toBe(0.14)
    })
    test('C2', () => {
        expect(lookupUValue(C2, 1.4, 0.9)).toBe(0.32)
    })
    test('C3', () => {
        expect(lookupUValue(C3, 0, 1.1)).toBe(0.26)
    })
    test('C4', () => {
        expect(lookupUValue(C4, 0.003, 0.41)).toBe(0.62)
    })
    test('C5', () => {
        expect(lookupUValue(C5, 2.5, 0.7)).toBe(0.49)
    })
})

describe('calculate: Solid Ground Floor (C1)', () => {
    test('no insulation', () => {
        const inputs = {
            floor_type: 'SOLID_GROUND_FLOOR',
            perimeter: 6.5,
            area: 10,
            floor_insulation: {
                hasInsulation: false
            },
            edge_insulation_type: 'none',
        }
        expect(calculate(inputs)).toBe(0.82);
        //resistance = 0 (no insulation), p/a = 0.65 ==> lookup(C1, 0, 0.65) = 0.82
    });
    test('with floor insulation', () => {
        const inputs = {
            floor_type: 'SOLID_GROUND_FLOOR',
            perimeter: 6.5,
            area: 10,
            floor_insulation: {
                hasInsulation: true,
                thickness: 0.1,
                conductivity: 'Granular insulation' //0.1
            },
            edge_insulation_type: 'none',
        }
        expect(calculate(inputs)).toBe(0.44);
        //resistance = 0.1/0.1 = 1, p/a = 0.65 ==> lookup(C1, 1, 0.65) = 0.44
    });
    test('with floor inslation + horizontal insulation (C2)', () => {
        const inputs = {
            floor_type: 'SOLID_GROUND_FLOOR',
            perimeter: 6.5,
            area: 10,
            floor_insulation: {
                hasInsulation: true,
                thickness: 0.1,
                conductivity: 'Granular insulation' //0.1
            },
            edge_insulation_type: 'horizontal',
            horizontal_edge_insulation: {
                thickness: 0.2,
                conductivity: 'Granular insulation', //0.1
                width: 1.5
            }
        }
        expect(calculate(inputs)).toBe(0.44 - 0.65 * 0.42);
        //resistance = 0.1/0.1 = 1, p/a = 0.65 ==> U_0 = lookup(C1, 1, 0.65) = 0.44
        //horizontal_resistance = 0.2/0.1 = 2, width = 1.5 ==> Psi_horizontal = lookup(C2, 2, 1.5) = 0.42
        //U_adjusted = 0.44 - 0.65*0.42
    });

    test('with floor insulation + vertical insulation (C3)', () => {
        const inputs = {
            floor_type: 'SOLID_GROUND_FLOOR',
            perimeter: 6.5,
            area: 10,
            floor_insulation: {
                hasInsulation: true,
                thickness: 0.1,
                conductivity: 'Granular insulation' //0.1
            },
            edge_insulation_type: 'vertical',
            vertical_edge_insulation: {
                thickness: 0.1,
                conductivity: 'Granular insulation', //0.1
                depth: 0.5
            }
        }
        expect(calculate(inputs)).toBe(0.44 - 0.65 * 0.27);
        //resistance = 0.1/0.1 = 1, p/a = 0.65 ==> U_0 = lookup(C1, 1, 0.65) = 0.44
        //vertical_resistance = 0.1/0.1 = 1, depth = 0.5 ==> Psi_vertical = lookup(C3, 1, 0.5) = 0.27
        //U_adjusted = 0.44 - 0.65*0.27
    });
})

describe('calculate: Suspended Floor (C4)', () => {
    const inputs = {
        floor_type: 'SUSPENDED_FLOOR',
        perimeter: 5,
        area: 10,
        floor_insulation: {
            hasInsulation: false
        },
        ventilation: 0.003
    }
    test('no insulation', () => {
        expect(calculate(inputs)).toBe(0.70);
        //ventilation = 0.003, p/a = 0.5 ==> lookup(C4, 0.003, 0.5) = 0.70
    });
    test('with insulation', () => {
        inputs.suspended_floor_insulation = true
        inputs.layer_resistances = {
            bridged: {
                F1: 0.85,
                R_M1: 3.5,
                F2: 0.15,
                R_M2: 1.167
            },
            notbridged: [0.04, 0.132, 0.18, 0.069, 0.06, 0.13]
        };
        expect(calculate(inputs)).toBeCloseTo(0.235);
        //uses the example in the docs: combined_method.md
        //U_T = 2 / (3.435 + 3.304) ~= 0.297
        //R_suspended_floor = 1/0.297 - 0.17 - 0.17 ~= 3.027
        //U_uninsulated = 0.70 (see previous test)
        //U_insulated = 1 / (1/U_uninsulated - 0.2 + R_suspended_floor)
        //U_insulated = 1 / (1/0.7 - 0.2 + 3.027) = 1 / 4.256 ~= 0.235
    });
})

describe('calculate: Basement Floor (C5)', () => {
    test('no insulation', () => {
        const inputs = {
            floor_type: 'BASEMENT_FLOOR',
            perimeter: 8,
            area: 10,
            floor_insulation: {
                hasInsulation: false
            },
            basement_depth: 2,
        }
        expect(calculate(inputs)).toBe(0.56);
        //basement_depth = 2, p/a = 0.8 ==> lookup(C5, 2, 0.8) = 0.56
    });
    test('with insulation', () => {
        const inputs = {
            floor_type: 'BASEMENT_FLOOR',
            perimeter: 1,
            area: 10,
            floor_insulation: {
                hasInsulation: true,
                thickness: 0.1,
                conductivity: 'Fibre insulation' //0.04
            },
            basement_depth: 1,
        }
        expect(calculate(inputs)).toBe((0.19 ** -1 + 2.5) ** -1);
    });
    //basement_depth = 1, p/a = 0.1 ==> U_uninsulated = lookup(C5, 1, 0.1) = 0.19
    //R_floor = 0.1/0.04 = 2.5
    //U_insulated = (0.19**-1 + 2.5)**-1
})
