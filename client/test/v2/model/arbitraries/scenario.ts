import fc from 'fast-check';
import { solarHotWaterOvershadingFactor } from '../../../../src/v2/model/datasets';
import { Orientation } from '../../../../src/v2/model/enums/orientation';
import { Overshading } from '../../../../src/v2/model/enums/overshading';
import { Region } from '../../../../src/v2/model/enums/region';
import { fcPartialRecord } from '../../../helpers/arbitraries';
import { legacyBoolean, sensibleFloat, stringySensibleFloat } from './values';
import { arbFabric } from './fabric';

const arbOvershading = fc
    .oneof(...Overshading.names.map((n) => fc.constant(n)))
    .map((n) => new Overshading(n));

const arbFloors = () =>
    fc.array(
        fc.record({
            area: fc.oneof(sensibleFloat, fc.constant('')),
            height: fc.oneof(sensibleFloat, fc.constant('')),
            name: fc.string(),
        }),
    );

// Only model input values
export const arbScenario = () =>
    fcPartialRecord({
        floors: arbFloors(),
        use_custom_occupancy: legacyBoolean(),
        custom_occupancy: fc.oneof(sensibleFloat, fc.constant('')),
        region: fc.integer({ min: 0, max: Region.names.length - 1 }),
        fabric: arbFabric(),
        water_heating: fcPartialRecord({
            low_water_use_design: fc.oneof(fc.boolean(), fc.constant(1)),
            annual_energy_content: sensibleFloat,
            override_annual_energy_content: fc.oneof(fc.boolean(), fc.constant(1)),
            solar_water_heating: fc.oneof(fc.boolean(), fc.constant(1)),
        }),
        SHW: fc.record({
            pump: fc.oneof(fc.constant('PV'), fc.constant('electric')),
            A: sensibleFloat,
            n0: sensibleFloat,
            a1: stringySensibleFloat(),
            a2: stringySensibleFloat(),
            orientation: fc.integer({
                min: 0,
                max: Orientation.names.length - 1,
            }),
            inclination: sensibleFloat,
            overshading: arbOvershading.map(solarHotWaterOvershadingFactor),
            Vs: sensibleFloat,
            combined_cylinder_volume: sensibleFloat,
        }),
        use_SHW: fc.oneof(fc.boolean(), fc.constant(1)),
    }).filter((scenario) => {
        // Custom occupancy invariant:
        if (
            (scenario.use_custom_occupancy === true ||
                scenario.use_custom_occupancy === 1) &&
            (scenario.custom_occupancy === undefined || scenario.custom_occupancy === '')
        ) {
            return false; // Throws ModelError in new model
        }

        // Custom water annual energy content invariant
        if (
            scenario.water_heating?.override_annual_energy_content &&
            scenario.water_heating.annual_energy_content === undefined
        ) {
            return false;
        }

        return true;
    });
