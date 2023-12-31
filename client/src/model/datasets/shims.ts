import { Month } from '../enums/month';
import { Orientation } from '../enums/orientation';
import { Overshading } from '../enums/overshading';
import { Region } from '../enums/region';
import { ModelError } from '../error';
import { datasets } from './legacy';

function isIndexable(val: unknown): val is Record<string | number, unknown> {
  return typeof val === 'object' && val !== null;
}

function wrapDataset(
  tableName: keyof typeof datasets,
  dimensionIndices: (string | number)[],
  providedContext: Record<string, unknown>,
): number {
  let out: unknown = datasets[tableName];
  for (const index of dimensionIndices) {
    if (isIndexable(out)) {
      out = out[index];
    } else {
      throw new ModelError(
        'datasets table did not contain a value for the provided indices',
        { tableName, dimensionIndices, providedContext },
      );
    }
  }
  if (typeof out !== 'number') {
    throw new ModelError(
      'datasets table contained a non-numeric value for the provided indices',
      { tableName, dimensionIndices, providedContext },
    );
  }
  return out;
}

/** datasets.k (SAP Table U5) */
export function solarFluxK(
  index: keyof typeof datasets.k,
  orientation: Orientation,
): number {
  return wrapDataset('k', [index, orientation.index0], { index, orientation });
}

/** datasets.table_u4 (SAP Table U4) */
export function latitudeRadians(region: Region): number {
  const latDegrees = wrapDataset('table_u4', [region.index0, 0], { region });
  return (latDegrees / 360) * 2 * Math.PI;
}

/** datasets.solar_declination (SAP Table U3) */
export function solarDeclinationRadians(month: Month): number {
  const declinationDegrees = wrapDataset('solar_declination', [month.index0], {
    month,
  });
  return (declinationDegrees / 360) * 2 * Math.PI;
}

/** datasets.table_u3 (SAP Table U3) */
export function meanGlobalSolarIrradianceHorizontal(
  region: Region,
  month: Month,
): number {
  return wrapDataset('table_u3', [region.index0, month.index0], { region, month });
}

/** datasets.table_6d_solar_access_factor */
export function solarAccessFactor(
  overshading: Overshading,
  season: 'summer' | 'winter',
): number {
  const seasonIndex = season === 'summer' ? 1 : 0;
  return wrapDataset('table_6d_solar_access_factor', [overshading.index0, seasonIndex], {
    overshading,
    season,
  });
}

/** datasets.table_6d_light_access_factor */
export function lightAccessFactor(overshading: Overshading): number {
  return wrapDataset('table_6d_light_access_factor', [overshading.index0], {
    overshading,
  });
}

/** datasets.table_1c */
// ratio
export function monthlyHotWaterUseFactor(month: Month): number {
  return wrapDataset('table_1c', [month.index0], { month });
}

/** datasets.table_1d */
// Kelvin
export function monthlyHotWaterTemperatureRise(month: Month): number {
  return wrapDataset('table_1d', [month.index0], { month });
}

/** datasets.table_u2 */
export function windSpeed(region: Region, month: Month): number {
  return wrapDataset('table_u2', [region.index0, month.index0], { month });
}

/** datasets.table_h4 */
export function solarHotWaterPrimaryCircuitLossFactor(month: Month): number {
  return wrapDataset('table_h4', [month.index0], { month });
}
