import fc from 'fast-check';

import { stringySensibleFloat } from './values';

export const arbFuels = () =>
    fc.dictionary(
        fc.string(),
        fc.record({
            category: fc.constantFrom(
                'Gas',
                'Solid fuel',
                'Generation',
                'generation',
                'Oil',
                'Electricity',
            ),
            standingcharge: stringySensibleFloat(),
            fuelcost: stringySensibleFloat(),
            co2factor: stringySensibleFloat(),
            primaryenergyfactor: stringySensibleFloat(),
        }),
        { minKeys: 1, maxKeys: 5 },
    );
