import fc from 'fast-check';

import { sensibleFloat, stringySensibleFloat } from './values';

export function arbFuels() {
    return fc.dictionary(
        fc.string(),
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
