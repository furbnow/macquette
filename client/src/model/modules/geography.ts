import { Scenario } from '../../data-schemas/scenario';
import { coalesceEmptyString } from '../../data-schemas/scenario/value-schemas';
import { cache } from '../../helpers/cache-decorators';
import { distance } from '../../helpers/distance';
import type { WeatherStation } from '../datasets/weather-stations';
import { weatherStations } from '../datasets/weather-stations';

export type GeographyInput = {
  elevation: number | null;
  latLong: [number, number] | null;
};

export function extractGeographyInputFromLegacy(scenario: Scenario): GeographyInput {
  return {
    elevation: coalesceEmptyString(scenario?.altitude, null) ?? null,
    latLong: scenario?.household?.latLong ?? null,
  };
}

export function metresAboveStation(stationElev: number, buildingElev: number): number {
  if (buildingElev < stationElev) {
    return 0;
  } else {
    return buildingElev - stationElev;
  }
}

export class Geography {
  readonly latLong: GeographyInput['latLong'];
  readonly elevation: GeographyInput['elevation'];

  constructor(readonly input: GeographyInput) {
    this.latLong = input.latLong;
    this.elevation = input.elevation;
  }

  /** Find closest weather station to the location using Vincenty distance */
  @cache
  get nearestWeatherStation(): WeatherStation | null {
    const latLong = this.latLong;
    if (latLong === null) {
      return null;
    }

    const withDistances = weatherStations.map((station) => {
      return {
        ...station,
        distance: distance(latLong, [station.lat, station.long]),
      };
    });
    withDistances.sort((a, b) => a.distance - b.distance);
    const closest = withDistances[0];
    if (closest !== undefined) {
      return closest;
    } else {
      return null;
    }
  }

  /** Calculate external design temp as per CIBSE A */
  get externalDesignTemperature(): number {
    const station = this.nearestWeatherStation;
    if (station === null || this.elevation === null) {
      return -4;
    } else {
      const m = metresAboveStation(station.altitude, this.elevation);

      // -0.6m per complete 100m of altitude increase
      return station.minTemp + Math.floor(m / 100) * -0.6;
    }
  }
}
