import fc from 'fast-check';
import { z } from 'zod';
import { heatingSystems } from '../../../../src/v2/data-schemas/scenario/heating-systems';

import { legacyBoolean } from './values';

export function heatingSystemInputs(
    fuelNames: string[],
): fc.Arbitrary<z.input<typeof heatingSystems>> {
    return fc.array(
        fc.record({
            provides: fc.constantFrom(
                ...(['water', 'heating_and_water', 'heating'] as const),
            ),
            fraction_water_heating: fc.integer({ min: 0, max: 10 }).map((i) => i / 10.0),
            instantaneous_water_heating: legacyBoolean(),
            primary_circuit_loss: fc.constantFrom('Yes' as const, 'No' as const),
            combi_loss: fc.constantFrom(
                ...([
                    0,
                    '0',
                    'Instantaneous, without keep hot-facility',
                    'Instantaneous, with keep-hot facility controlled by time clock',
                    'Instantaneous, with keep-hot facility not controlled by time clock',
                    'Storage combi boiler >= 55 litres',
                    'Storage combi boiler < 55 litres',
                    'Storage combi boiler  55 litres',
                ] as const),
            ),
            fuel: fc.constantFrom(...fuelNames),
            category: fc.constantFrom(
                ...([
                    'Combi boilers',
                    'System boilers',
                    'Heat pumps',
                    'Room heaters',
                    'Warm air systems',
                    'Hot water only',
                ] as const),
            ),
        }),
    );
}
