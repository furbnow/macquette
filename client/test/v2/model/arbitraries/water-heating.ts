import fc from 'fast-check';
import { isTruthy } from '../../../../src/v2/helpers/is-truthy';

import { chainMerge, fcPartialRecord } from '../../../helpers/arbitraries';
import { legacyBoolean, sensibleFloat, stringySensibleFloat } from './values';

export const waterHeatingInputs = fcPartialRecord({
    override_annual_energy_content: fc.oneof(fc.boolean(), fc.constant(1 as const)),
    annual_energy_content: sensibleFloat,
})
    .filter((energyContentFields) => {
        // If a water heating override is configured, make sure a value is given
        if (
            isTruthy(energyContentFields.override_annual_energy_content) &&
            energyContentFields.annual_energy_content === undefined
        ) {
            return false;
        }
        return true;
    })
    .chain(
        chainMerge(
            fcPartialRecord({
                low_water_use_design: fc.oneof(fc.boolean(), fc.constant(1 as const)),
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
            }),
        ),
    );
