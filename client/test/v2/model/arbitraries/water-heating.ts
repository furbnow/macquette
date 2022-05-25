import fc from 'fast-check';

import { fcPartialRecord } from '../../../helpers/arbitraries';
import { legacyBoolean, sensibleFloat, stringySensibleFloat } from './values';

export const heatingSystemInputs = (fuelNames: string[]) =>
    fc.array(
        fc.record({
            provides: fc.constantFrom('water', 'heating_and_water', 'heating'),
            fraction_water_heating: fc.integer({ min: 0, max: 10 }).map((i) => i / 10.0),
            instantaneous_water_heating: legacyBoolean(),
            primary_circuit_loss: fc.constantFrom('Yes', 'No'),
            combi_loss: fc.constantFrom(
                0,
                '0',
                'Instantaneous, without keep hot-facility',
                'Instantaneous, with keep-hot facility controlled by time clock',
                'Instantaneous, with keep-hot facility not controlled by time clock',
                'Storage combi boiler >= 55 litres',
                'Storage combi boiler < 55 litres',
                'Storage combi boiler  55 litres',
            ),
            fuel: fc.constantFrom(...fuelNames),
        }),
    );

export const waterHeatingInputs = fcPartialRecord({
    annual_energy_content: sensibleFloat,
    low_water_use_design: fc.oneof(fc.boolean(), fc.constant(1)),
    override_annual_energy_content: fc.oneof(fc.boolean(), fc.constant(1)),
    solar_water_heating: fc.oneof(fc.boolean(), fc.constant(1)),
    hot_water_control_type: fc.constantFrom(
        'no_cylinder_thermostat',
        'Cylinder thermostat, water heating not separately timed',
        'Cylinder thermostat, water heating separately timed',
    ),
    pipework_insulation: fc.constantFrom(
        'All accesible piperwok insulated',
        'First 1m from cylinder insulated',
        'Fully insulated primary pipework',
        'Uninsulated primary pipework',
    ),
    storage_type: fc.oneof(
        fc.record({
            declared_loss_factor_known: fc.constant(true),
            manufacturer_loss_factor: fc.oneof(
                fc.constant(false),
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
