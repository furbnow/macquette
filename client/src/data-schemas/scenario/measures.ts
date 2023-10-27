import { z } from 'zod';

import { stringyFloatSchema } from './value-schemas';

const optionalString = z
  .string()
  .optional()
  .transform((val) => val ?? '');
const numberOrDefaultZero = stringyFloatSchema
  .optional()
  .nullable()
  .transform((val) => (val === '' ? 0 : val ?? 0));

const genericMeasure = z.object({
  associated_work: optionalString,
  benefits: optionalString,
  cost: numberOrDefaultZero,
  cost_total: numberOrDefaultZero,
  cost_units: optionalString,
  min_cost: numberOrDefaultZero,
  description: optionalString,
  disruption: optionalString,
  key_risks: optionalString,
  location: optionalString,
  maintenance: optionalString,
  name: z.string(),
  notes: optionalString,
  performance: optionalString,
  quantity: numberOrDefaultZero,
  who_by: optionalString,
});
export type GenericMeasure = z.infer<typeof genericMeasure>;

const measureInMeasure = z.object({ measure: genericMeasure });
const measuresRecord = z.record(z.string(), measureInMeasure);

export const measures = z
  .object({
    ventilation: z
      .object({
        extract_ventilation_points: measuresRecord,
        intentional_vents_and_flues_measures: measuresRecord,
        draught_proofing_measures: measureInMeasure,
        ventilation_systems_measures: measureInMeasure,
        clothes_drying_facilities: measuresRecord,
      })
      .partial(),
    water_heating: z
      .object({
        water_usage: measuresRecord,
        storage_type_measures: measureInMeasure,
        pipework_insulation: measureInMeasure,
        hot_water_control_type: measureInMeasure,
      })
      .partial(),
    LAC: z.object({ lighting: measureInMeasure }).partial(),
    PV_generation: measureInMeasure,
    space_heating_control_type: measuresRecord,
    heating_systems: measuresRecord,
    thermal_bridging: z.object({
      measure: z.object({
        value: z.string(),
        description: z.string(),
      }),
    }),
  })
  .partial();
