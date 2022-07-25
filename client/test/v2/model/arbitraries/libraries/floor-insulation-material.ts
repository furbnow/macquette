import { sensibleFloat } from '../values';

export function arbFloorInsulationMaterialItem() {
    return sensibleFloat.map((conductivity) => ({
        conductivity,
        tags: undefined,
        tag: 'arb tag',
        name: 'arb name',
        description: 'arb description',
    }));
}
