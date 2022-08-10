import fc from 'fast-check';

import { fcPartialRecord } from '../../../helpers/arbitraries';
import { legacyBoolean, stringyNumber, stringySensibleInteger } from './values';

export function arbLAC_calculation_type() {
    return fc.constantFrom(...(['SAP', 'carboncoop_SAPlighting'] as const));
}

function arbLACFuels(fuelNames: string[]) {
    return fc.subarray(fuelNames).chain((sub) =>
        fc.tuple(
            ...sub.map((fuelName) =>
                fc.record({
                    fuel: fc.constant(fuelName),
                    fraction: fc.double({
                        next: true,
                        noNaN: true,
                        min: 1e-7,
                        max: 1,
                    }),
                }),
            ),
        ),
    );
}

export function arbLAC(fuelNames: string[]) {
    return fcPartialRecord({
        L: stringySensibleInteger(),
        LLE: stringyNumber(fc.integer({ min: 0, max: Math.pow(2, 7) })),
        reduced_heat_gains_lighting: legacyBoolean(),
        energy_efficient_appliances: legacyBoolean(),
        energy_efficient_cooking: legacyBoolean(),
        fuels_lighting: arbLACFuels(fuelNames),
        fuels_appliances: arbLACFuels(fuelNames),
        fuels_cooking: arbLACFuels(fuelNames),
    });
}
