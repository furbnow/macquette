import fc from 'fast-check';

import { fcPartialRecord } from '../../../helpers/arbitraries';
import { legacyBoolean, sensibleFloat, stringySensibleFloat } from './values';

export function heatingSystemInputs(fuelNames: string[]) {
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
        }),
    );
}

export const waterHeatingInputs = fcPartialRecord({
    annual_energy_content: sensibleFloat,
    low_water_use_design: fc.oneof(fc.boolean(), fc.constant(1 as const)),
    override_annual_energy_content: fc.oneof(fc.boolean(), fc.constant(1 as const)),
    solar_water_heating: fc.oneof(fc.boolean(), fc.constant(1 as const)),
    hot_water_control_type: fc.constantFrom(
        ...([
            'no_cylinder_thermostat',
            'Cylinder thermostat, water heating not separately timed',
            'Cylinder thermostat, water heating separately timed',
        ] as const),
    ),
    pipework_insulation: fc.constantFrom(
        ...([
            'All accesible piperwok insulated',
            'First 1m from cylinder insulated',
            'Fully insulated primary pipework',
            'Uninsulated primary pipework',
        ] as const),
    ),
    storage_type: fc.oneof(
        fc.record({
            declared_loss_factor_known: fc.constant(true),
            manufacturer_loss_factor: fc.oneof(
                fc.constant(false as const),
                stringySensibleFloat(),
            ),
            temperature_factor_a: stringySensibleFloat(),
            storage_volume: stringySensibleFloat(),
        }),
        fc.record({
            declared_loss_factor_known: fc.constant(false),
            storage_volume: stringySensibleFloat(),
            loss_factor_b: stringySensibleFloat(),
            volume_factor_b: stringySensibleFloat(),
            temperature_factor_b: stringySensibleFloat(),
        }),
    ),
    contains_dedicated_solar_storage_or_WWHRS: stringySensibleFloat(),
    hot_water_store_in_dwelling: legacyBoolean(),
    community_heating: legacyBoolean(),
});
