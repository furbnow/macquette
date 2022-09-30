import { FloorUValueWarning } from '../../../../data-schemas/scenario/fabric/floor-u-value';
import { WithWarnings } from '../../../../helpers/with-warnings';
import type { InsulationInput } from './input-types';

export function calculateInsulationResistance(
    insulation: InsulationInput | null,
): WithWarnings<number, FloorUValueWarning> {
    switch (insulation?.mechanism) {
        case undefined:
            return WithWarnings.empty(0);
        case 'resistance':
            return WithWarnings.empty(insulation.material.resistance);
        case 'conductivity':
            if (insulation.material.conductivity === 0) {
                return new WithWarnings(
                    0,
                    new Set([
                        {
                            type: 'zero division warning',
                            namespace: 'floor u-value calculator',
                            path: ['resistance'],
                            outputReplacedWith: 0,
                        },
                    ]),
                );
            }
            return WithWarnings.empty(
                insulation.thickness / insulation.material.conductivity,
            );
    }
}
