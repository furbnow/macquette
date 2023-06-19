import fc from 'fast-check';

import { sensibleFloat } from '../../legacy-values';

export function arbFloorInsulationConductivityMaterialItem() {
    return sensibleFloat.map((conductivity) => ({
        mechanism: 'conductivity' as const,
        conductivity,
        tags: undefined,
        tag: 'arb tag',
        name: 'arb name',
        description: 'arb description',
    }));
}
export function arbFloorInsulationResistanceMaterialItem() {
    return sensibleFloat.map((resistance) => ({
        mechanism: 'resistance' as const,
        resistance,
        tags: undefined,
        tag: 'arb tag',
        name: 'arb name',
        description: 'arb description',
    }));
}
export function arbFloorInsulationMaterialItem() {
    return fc.oneof(
        arbFloorInsulationConductivityMaterialItem(),
        arbFloorInsulationResistanceMaterialItem(),
    );
}
