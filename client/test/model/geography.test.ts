import { Geography, metresAboveStation } from '../../src/model/modules/geography';

describe('test design temperature calculation', () => {
  it('nearest weather station to Stockport should be Manchester', () => {
    const geography = new Geography({
      latLong: [53.41, -2.157],
      elevation: null,
    });
    const station = geography.nearestWeatherStation;
    expect(station?.city).toBe('Manchester');
  });

  it('nearest weather station to Aberdeen should be Edinburgh', () => {
    const geography = new Geography({
      latLong: [57.128, -2.086],
      elevation: null,
    });
    const station = geography.nearestWeatherStation;
    expect(station?.city).toBe('Edinburgh');
  });

  it('metersAboveStation should work', () => {
    expect(metresAboveStation(50, 150)).toBe(100);
    expect(metresAboveStation(100, 0)).toBe(0);
  });

  it('externalDesignTemperature should be 0.6deg above Manchester for High Crompton, Oldham', () => {
    const geography = new Geography({
      latLong: [53.583, -2.108],
      elevation: 207,
    });
    expect(geography.externalDesignTemperature).toBe(-4.5 - 0.6);
  });

  it('externalDesignTemperature should be -4 if no coordinates', () => {
    const geography = new Geography({
      latLong: null,
      elevation: null,
    });
    expect(geography.externalDesignTemperature).toBe(-4);
  });
});
