import fc from 'fast-check';

import { Fuels } from '../../../src/model/modules/fuels';
import { sensibleFloat, stringySensibleFloat } from '../legacy-values';

export function arbFuels() {
    return fc.dictionary(
        fc.oneof(
            fc.constant(Fuels.STANDARD_TARIFF),
            fc.constant(Fuels.GENERATION),
            fc.string().filter((val) => val !== '__proto__'),
        ),
        fc.record({
            category: fc.constantFrom(
                ...([
                    'Gas',
                    'Solid fuel',
                    'Generation',
                    'generation',
                    'Oil',
                    'Electricity',
                ] as const),
            ),
            standingcharge: sensibleFloat,
            fuelcost: stringySensibleFloat(),
            co2factor: stringySensibleFloat(),
            primaryenergyfactor: stringySensibleFloat(),
        }),
        { minKeys: 1, maxKeys: 5 },
    );
}