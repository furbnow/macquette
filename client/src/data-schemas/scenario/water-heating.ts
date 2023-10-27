import { z } from 'zod';

import { legacyBoolean, stringyFloatSchema } from './value-schemas';

export const waterHeating = z
  .object({
    // Model inputs
    annual_energy_content: z.number(),
    low_water_use_design: z.union([z.literal(1), z.boolean()]),
    override_annual_energy_content: z.union([z.literal(1), z.boolean()]),
    solar_water_heating: z.union([z.literal(1), z.boolean()]),
    hot_water_control_type: z.enum([
      'no_cylinder_thermostat',
      'Cylinder thermostat, water heating not separately timed',
      'Cylinder thermostat, water heating separately timed',
    ]),
    pipework_insulation: z.enum([
      'All accesible piperwok insulated',
      'First 1m from cylinder insulated',
      'Fully insulated primary pipework',
      'Uninsulated primary pipework',
    ]),
    Vc: z.number(),
    storage_type: z
      .object({
        declared_loss_factor_known: z.boolean(),
        manufacturer_loss_factor: z.union([z.literal(false), stringyFloatSchema]),
        temperature_factor_a: stringyFloatSchema,
        storage_volume: stringyFloatSchema,
        loss_factor_b: stringyFloatSchema,
        volume_factor_b: stringyFloatSchema,
        temperature_factor_b: stringyFloatSchema,
      })
      .partial(),
    contains_dedicated_solar_storage_or_WWHRS: stringyFloatSchema, // You'd think it'd be a boolean...
    hot_water_store_in_dwelling: legacyBoolean,
    community_heating: legacyBoolean,

    // Model outputs
    Vd_average: z.number(),
  })
  .partial();
