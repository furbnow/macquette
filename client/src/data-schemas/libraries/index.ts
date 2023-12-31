import { z } from 'zod';

import { appliancesAndCooking } from './appliances-and-cooking';
import { clothesDryingFacilitiesMeasures } from './clothes-drying-facilities';
import { draughtProofingMeasures } from './draught-proofing-measures';
import { fabricElements, fabricMeasures } from './elements';
import { extractVentilationPointsMeasures } from './extract-ventilation-points';
import { floorInsulation } from './floor-insulation';
import { generationMeasures } from './generation-measures';
import { heatingSystems, heatingSystemsMeasures } from './heating-systems';
import { hotWaterControlTypeMeasures } from './hot-water-control-type';
import {
  intentionalVentsAndFlues,
  intentionalVentsAndFluesMeasures,
} from './intentional-vents-and-flues';
import { pipeworkInsulation } from './pipework-insulation';
import { spaceHeatingControlTypeMeasures } from './space-heating-control-type';
import { storageType, storageTypeMeasures } from './storage-type';
import { ventilationSystems, ventilationSystemsMeasures } from './ventilation-system';
import { waterUsageMeasures } from './water-usage';

export const librarySchema = z.discriminatedUnion('type', [
  appliancesAndCooking,
  clothesDryingFacilitiesMeasures,
  draughtProofingMeasures,
  extractVentilationPointsMeasures,
  fabricElements,
  fabricMeasures,
  floorInsulation,
  generationMeasures,
  heatingSystems,
  heatingSystemsMeasures,
  hotWaterControlTypeMeasures,
  intentionalVentsAndFlues,
  intentionalVentsAndFluesMeasures,
  pipeworkInsulation,
  spaceHeatingControlTypeMeasures,
  storageType,
  storageTypeMeasures,
  ventilationSystems,
  ventilationSystemsMeasures,
  waterUsageMeasures,
]);

export type Library = z.infer<typeof librarySchema>;
