export type WeatherStation = {
  city: string;
  minTemp: number;
  altitude: number;
  lat: number;
  long: number;
};

/**
 * Weather station data from CIBSE A table 2.5
 * Altitude & lat+long taken from the highest weather station per city
 * Temperature is the dry bulb 99.6th-percentile value
 */
export const weatherStations: WeatherStation[] = [
  { city: 'Belfast', minTemp: -3.2, altitude: 63, lat: 54.664, long: -6.224 },
  { city: 'Birmingham', minTemp: -5.1, altitude: 96, lat: 52.48, long: -1.689 },
  { city: 'Cardiff', minTemp: -3.1, altitude: 65, lat: 51.4, long: -3.343 },
  { city: 'Edinburgh', minTemp: -5.4, altitude: 57, lat: 55.928, long: -3.343 },
  { city: 'Glasgow', minTemp: -5.6, altitude: 59, lat: 55.907, long: -4.531 },
  { city: 'Leeds', minTemp: -3.3, altitude: 85, lat: 3.836, long: -1.197 },
  { city: 'London', minTemp: -3.0, altitude: 25, lat: 51.479, long: -0.449 },
  { city: 'Manchester', minTemp: -4.5, altitude: 88, lat: 53.339, long: -2.153 },
  { city: 'Newcastle', minTemp: -3.7, altitude: 142, lat: 55.02, long: -1.88 },
  { city: 'Norwich', minTemp: -4.6, altitude: 21, lat: 52.651, long: 0.568 },
  { city: 'Nottingham', minTemp: -3.9, altitude: 117, lat: 53.005, long: -1.25 },
  { city: 'Plymouth', minTemp: -1.5, altitude: 50, lat: 50.354, long: -4.12 },
  { city: 'Southhampton', minTemp: -4.8, altitude: 10, lat: 50.779, long: -1.835 },
  { city: 'Swindon', minTemp: -4.6, altitude: 82, lat: 51.758, long: -1.576 },
];
