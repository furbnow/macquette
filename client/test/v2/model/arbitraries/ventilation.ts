import fc from 'fast-check';

import { fcPartialRecord } from '../../../helpers/arbitraries';
import { legacyBoolean, sensibleFloat, stringySensibleFloat } from './values';

export const arbVentilation = () =>
    fcPartialRecord({
        IVF: fc.array(fc.record({ ventilation_rate: stringySensibleFloat() })),
        air_permeability_test: legacyBoolean(),
        air_permeability_value: stringySensibleFloat(),
        dwelling_construction: fc.oneof(
            ...(['timberframe', 'masonry'] as const).map(fc.constant),
        ),
        suspended_wooden_floor: fc.oneof(
            ...([0, 'sealed', 'unsealed'] as const).map(fc.constant),
        ),
        percentage_draught_proofed: sensibleFloat,
        draught_lobby: legacyBoolean(),
        number_of_sides_sheltered: fc.nat(),
        ventilation_type: fc.oneof(
            ...(['NV', 'IE', 'MEV', 'PS', 'MVHR', 'MV', 'DEV'] as const).map(fc.constant),
        ),
        EVP: fc.array(fc.record({ ventilation_rate: stringySensibleFloat() })),
        system_air_change_rate: fc.oneof(
            fc.constant('na'),
            fc.constant('n/a'),
            stringySensibleFloat(),
        ),
        balanced_heat_recovery_efficiency: fc.oneof(
            fc.constant('na'),
            fc.constant('n/a'),
            stringySensibleFloat(),
        ),
    });
