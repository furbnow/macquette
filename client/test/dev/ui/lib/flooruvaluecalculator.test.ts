import calculate, {
    findNearestIndex,
    lookupUValue,
} from '../../../../src/dev/ui/lib/flooruvaluecalculator/flooruvaluecalculator';
import {
    C1,
    C2,
    C3,
    C4,
    C5,
} from '../../../../src/dev/ui/data/flooruvaluecalculator/tables';

describe('findNearestIndex', () => {
    const arr = [-20, -10, 0, 10, 20];

    test('a positive value, within range', () => {
        expect(findNearestIndex(arr, 12)).toBe(3);
    });
    test('a negative value, within range', () => {
        expect(findNearestIndex(arr, -7)).toBe(1);
    });
    test('a big positive value, outside range', () => {
        expect(findNearestIndex(arr, 1e6)).toBe(4);
    });
    test('a big negative value, outside range', () => {
        expect(findNearestIndex(arr, -1e6)).toBe(0);
    });
});

describe('lookupUValue', () => {
    test('C1', () => {
        expect(lookupUValue(C1, 1.5, 0.1)).toBe(0.14);
    });
    test('C2', () => {
        expect(lookupUValue(C2, 1.4, 0.9)).toBe(0.32);
    });
    test('C3', () => {
        expect(lookupUValue(C3, 0, 1.1)).toBe(0.26);
    });
    test('C4', () => {
        expect(lookupUValue(C4, 0.003, 0.41)).toBe(0.62);
    });
    test('C5', () => {
        expect(lookupUValue(C5, 2.5, 0.7)).toBe(0.49);
    });
});

describe('calculate: Solid Ground Floor (C1)', () => {
    const inputs1 = {
        floor_type: 'SOLID_GROUND_FLOOR',
        perimeter: 6.5,
        area: 10,
        floor_insulation: {
            hasInsulation: false,
        },
        edge_insulation_type: 'none',
    };
    test('no insulation', () => {
        expect(calculate(inputs1)).toBe(0.82);
        //resistance = 0 (no insulation), p/a = 0.65 ==> lookup(C1, 0, 0.65) = 0.82
    });

    const inputs2 = {
        floor_type: 'SOLID_GROUND_FLOOR',
        perimeter: 6.5,
        area: 10,
        floor_insulation: {
            hasInsulation: true,
            thickness: 0.1,
            conductivity: 'Granular insulation', //0.1
        },
        edge_insulation_type: 'none',
    };
    test('with floor insulation', () => {
        expect(calculate(inputs2)).toBe(0.44);
        //resistance = 0.1/0.1 = 1, p/a = 0.65 ==> lookup(C1, 1, 0.65) = 0.44
    });

    const inputs3 = {
        floor_type: 'SOLID_GROUND_FLOOR',
        perimeter: 6.5,
        area: 10,
        floor_insulation: {
            hasInsulation: true,
            thickness: 0.1,
            conductivity: 'Granular insulation', //0.1
        },
        edge_insulation_type: 'horizontal',
        horizontal_edge_insulation: {
            thickness: 0.2,
            conductivity: 'Granular insulation', //0.1
            width: 1.5,
        },
    };
    test('with floor inslation + horizontal insulation (C2)', () => {
        expect(calculate(inputs3)).toBe(0.44 - 0.65 * 0.42);
        //resistance = 0.1/0.1 = 1, p/a = 0.65 ==> U_0 = lookup(C1, 1, 0.65) = 0.44
        //horizontal_resistance = 0.2/0.1 = 2, width = 1.5 ==> Psi_horizontal = lookup(C2, 2, 1.5) = 0.42
        //U_adjusted = 0.44 - 0.65*0.42
    });

    const inputs4 = {
        floor_type: 'SOLID_GROUND_FLOOR',
        perimeter: 6.5,
        area: 10,
        floor_insulation: {
            hasInsulation: true,
            thickness: 0.1,
            conductivity: 'Granular insulation', //0.1
        },
        edge_insulation_type: 'vertical',
        vertical_edge_insulation: {
            thickness: 0.1,
            conductivity: 'Granular insulation', //0.1
            depth: 0.5,
        },
    };
    test('with floor insulation + vertical insulation (C3)', () => {
        expect(calculate(inputs4)).toBe(0.44 - 0.65 * 0.27);
        //resistance = 0.1/0.1 = 1, p/a = 0.65 ==> U_0 = lookup(C1, 1, 0.65) = 0.44
        //vertical_resistance = 0.1/0.1 = 1, depth = 0.5 ==> Psi_vertical = lookup(C3, 1, 0.5) = 0.27
        //U_adjusted = 0.44 - 0.65*0.27
    });
});

describe('calculate: Suspended Floor (C4)', () => {
    const inputs5 = {
        floor_type: 'SUSPENDED_FLOOR',
        perimeter: 5,
        area: 10,
        floor_insulation: {
            hasInsulation: false,
        },
        ventilation: 0.003,
    };
    test('no insulation', () => {
        expect(calculate(inputs5)).toBe(0.7);
        //ventilation = 0.003, p/a = 0.5 ==> lookup(C4, 0.003, 0.5) = 0.70
    });
});

describe('calculate: Basement Floor (C5)', () => {
    const inputs6 = {
        floor_type: 'BASEMENT_FLOOR',
        perimeter: 8,
        area: 10,
        floor_insulation: {
            hasInsulation: false,
        },
        basement_depth: 2,
    };
    test('no insulation', () => {
        expect(calculate(inputs6)).toBe(0.56);
        //basement_depth = 2, p/a = 0.8 ==> lookup(C5, 2, 0.8) = 0.56
    });

    const inputs7 = {
        floor_type: 'BASEMENT_FLOOR',
        perimeter: 1,
        area: 10,
        floor_insulation: {
            hasInsulation: true,
            thickness: 0.1,
            conductivity: 'Fibre insulation', //0.04
        },
        basement_depth: 1,
    };
    test('with insulation', () => {
        expect(calculate(inputs7)).toBe((0.19 ** -1 + 2.5) ** -1);
    });
    //basement_depth = 1, p/a = 0.1 ==> U_uninsulated = lookup(C5, 1, 0.1) = 0.19
    //R_floor = 0.1/0.04 = 2.5
    //U_insulated = (0.19**-1 + 2.5)**-1
});
