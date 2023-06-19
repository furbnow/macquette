import type { InsulationInput } from './input-types';

export function calculateInsulationResistance(
    insulation: InsulationInput | null,
): number {
    switch (insulation?.mechanism) {
        case undefined:
            return 0;
        case 'resistance':
            return insulation.material.resistance;
        case 'conductivity':
            return insulation.thickness / insulation.material.conductivity;
    }
}
