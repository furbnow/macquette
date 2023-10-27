import { TypeOf, t } from '../../data-schemas/visitable-types';
import { sum } from '../../helpers/array-reducers';
import { cache, cacheMonth } from '../../helpers/cache-decorators';
import { solarHotWaterOvershadingFactor } from '../datasets';
import { Month } from '../enums/month';
import { Orientation } from '../enums/orientation';
import { Overshading } from '../enums/overshading';
import { Region } from '../enums/region';
import {
  calculateSolarRadiationAnnual,
  calculateSolarRadiationMonthly,
} from '../solar-flux';

export const solarHotWaterInput = t.nullable(
  t.struct({
    pump: t.enum(['PV', 'electric'], { default_: 'electric' }),
    dedicatedSolarStorageVolume: t.number(),
    combinedCylinderVolume: t.number(),
    collector: t.struct({
      apertureArea: t.number(),
      inclination: t.number(),
      orientation: t.enum([...Orientation.names]),
      overshading: t.enum([...Overshading.names]),
      parameters: t.discriminatedUnion('source', [
        t.struct({
          source: t.literal('test certificate'),
          zeroLossEfficiency: t.number(),
          linearHeatLossCoefficient: t.number(),
          secondOrderHeatLossCoefficient: t.number(),
        }),
        t.struct({
          source: t.literal('estimate'),
          collectorType: t.enum(['evacuated tube', 'flat plate, glazed', 'unglazed'], {
            default_: 'unglazed',
          }),
          apertureAreaType: t.enum(['gross', 'exact'], {
            default_: 'gross',
          }),
        }),
      ]),
    }),
  }),
);
export type SolarHotWaterInput = TypeOf<typeof solarHotWaterInput>;
type SolarHotWaterEnabledInput = Exclude<SolarHotWaterInput, null>;

export type SolarHotWaterDependencies = {
  region: Region;
  waterCommon: {
    dailyHotWaterUsageLitresMeanAnnual: number;
    hotWaterEnergyContentAnnual: number;
    solarHotWater: boolean;
  };
};

export type SolarHotWater = SolarHotWaterEnabled | SolarHotWaterNoop;

export class SolarHotWaterEnabled {
  constructor(
    private input: SolarHotWaterEnabledInput,
    private dependencies: SolarHotWaterDependencies,
  ) {}

  private get resolvedApertureArea(): number {
    const { apertureArea, parameters } = this.input.collector;
    if (parameters.source === 'estimate' && parameters.apertureAreaType === 'gross') {
      switch (parameters.collectorType) {
        case 'evacuated tube':
          return 0.72 * apertureArea;
        case 'flat plate, glazed':
          return 0.9 * apertureArea;
        case 'unglazed':
          return apertureArea;
      }
    } else {
      return apertureArea;
    }
  }

  get aStar(): number {
    const { parameters } = this.input.collector;
    switch (parameters.source) {
      case 'test certificate': {
        return (
          0.892 *
          (parameters.linearHeatLossCoefficient +
            45 * parameters.secondOrderHeatLossCoefficient)
        );
      }
      case 'estimate': {
        switch (parameters.collectorType) {
          case 'evacuated tube':
            return 3;
          case 'flat plate, glazed':
            return 6;
          case 'unglazed':
            return 20;
        }
      }
    }
  }

  private get zeroLossEfficiency(): number {
    const { parameters } = this.input.collector;
    switch (parameters.source) {
      case 'test certificate': {
        return parameters.zeroLossEfficiency;
      }
      case 'estimate': {
        switch (parameters.collectorType) {
          case 'evacuated tube':
            return 0.6;
          case 'flat plate, glazed':
            return 0.75;
          case 'unglazed':
            return 0.9;
        }
      }
    }
  }

  get collectorPerformanceRatio(): number {
    return this.aStar / this.zeroLossEfficiency;
  }

  @cache
  get solarRadiationAnnual(): number {
    const { orientation, inclination } = this.input.collector;
    if (orientation === null || inclination === null) {
      return NaN;
    }
    return calculateSolarRadiationAnnual(
      this.dependencies.region,
      new Orientation(orientation),
      inclination,
    );
  }

  get solarEnergyAvailable(): number {
    const { overshading } = this.input.collector;
    if (overshading === null) {
      return 0;
    }
    return (
      this.resolvedApertureArea *
      this.zeroLossEfficiency *
      this.solarRadiationAnnual *
      solarHotWaterOvershadingFactor(overshading)
    );
  }

  get solarToLoadRatio(): number {
    return (
      this.solarEnergyAvailable /
      this.dependencies.waterCommon.hotWaterEnergyContentAnnual
    );
  }

  get utilisationFactor(): number {
    // I think we should be doing a 10% reduction in certain cases (if
    // heated by a boiler and no "cylinder stat"), but we don't. (SAP9 p78)
    if (this.solarToLoadRatio > 0) {
      return 1 - Math.exp(-1 / this.solarToLoadRatio);
    } else {
      return 0;
    }
  }

  get collectorPerformanceFactor(): number {
    let out: number;
    if (this.collectorPerformanceRatio < 20) {
      out =
        0.97 -
        0.0367 * this.collectorPerformanceRatio +
        0.0006 * Math.pow(this.collectorPerformanceRatio, 2);
    } else {
      out = 0.693 - 0.0108 * this.collectorPerformanceRatio;
    }
    return Math.max(0, out);
  }

  get effectiveSolarVolume(): number {
    const { combinedCylinderVolume, dedicatedSolarStorageVolume } = this.input;
    if (combinedCylinderVolume <= 0) {
      return dedicatedSolarStorageVolume;
    } else {
      return (
        dedicatedSolarStorageVolume +
        0.3 * (combinedCylinderVolume - dedicatedSolarStorageVolume)
      );
    }
  }

  get volumeRatio(): number {
    return (
      this.effectiveSolarVolume /
      this.dependencies.waterCommon.dailyHotWaterUsageLitresMeanAnnual
    );
  }

  // aka f2
  get solarStorageVolumeFactor(): number {
    // We should clamp this at a lower bound of 0 to prevent the
    // calculation from finding that the water heating needs to put energy
    // *into* the SHW.
    return Math.min(1, 1 + 0.2 * Math.log(this.volumeRatio));
  }

  // aka Q_s
  get solarInputAnnual(): number {
    const out =
      this.solarEnergyAvailable *
      this.utilisationFactor *
      this.collectorPerformanceFactor *
      this.solarStorageVolumeFactor;
    if (Number.isNaN(out)) {
      return 0;
    } else {
      return out;
    }
  }

  @cache
  private get averageSolarRadiationAnnual(): number {
    // This doesn't seem right. Surely the days in the month should be
    // involved somehow? Why can't we use the annual average solar rad
    // function we already have? Also what's with the 0.024 in that
    // function anyway...
    const { region } = this.dependencies;
    const { orientation, inclination } = this.input.collector;
    if (orientation === null) {
      return NaN;
    }
    return (
      sum(
        Month.all.map((m) =>
          calculateSolarRadiationMonthly(
            region,
            new Orientation(orientation),
            inclination,
            m,
          ),
        ),
      ) / 12
    );
  }

  @cacheMonth
  solarInputMonthly(month: Month): number {
    const { region } = this.dependencies;
    const { orientation, inclination } = this.input.collector;
    if (orientation === null) {
      return 0;
    }
    const monthSolarRadiationWeight =
      calculateSolarRadiationMonthly(
        region,
        new Orientation(orientation),
        inclination,
        month,
      ) / this.averageSolarRadiationAnnual;
    return -this.solarInputAnnual * monthSolarRadiationWeight * (month.days / 365);
  }

  /* eslint-disable
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-argument,
       @typescript-eslint/no-unsafe-assignment,
       @typescript-eslint/no-unsafe-member-access,
    */
  mutateLegacyData(data: any) {
    data.SHW = data.SHW ?? {};
    const { SHW } = data;
    SHW.pump = this.input.pump;
    SHW.a = this.aStar;
    SHW.collector_performance_ratio = this.collectorPerformanceRatio;
    SHW.annual_solar = this.solarRadiationAnnual;
    SHW.solar_energy_available = this.solarEnergyAvailable;
    SHW.solar_load_ratio = this.solarToLoadRatio;
    SHW.utilisation_factor = this.utilisationFactor;
    SHW.collector_performance_factor = this.collectorPerformanceFactor;
    SHW.Veff = this.effectiveSolarVolume;
    SHW.volume_ratio = this.volumeRatio;
    SHW.f2 = this.solarStorageVolumeFactor;
    SHW.Qs = this.solarInputAnnual;
    SHW.Qs_monthly = Month.all.map((m) => this.solarInputMonthly(m));
  }
  /* eslint-enable */
}

export class SolarHotWaterNoop {
  solarInputAnnual = 0;

  solarInputMonthly(): number {
    return 0;
  }

  /* eslint-disable
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-assignment,
       @typescript-eslint/no-unsafe-member-access,
    */
  mutateLegacyData(data: any) {
    data.SHW = data.SHW ?? {};
    data.SHW.pump = undefined;
  }
  /* eslint-enable */
}

export function constructSolarHotWater(
  input: SolarHotWaterInput,
  dependencies: SolarHotWaterDependencies,
): SolarHotWaterEnabled | SolarHotWaterNoop {
  if (!dependencies.waterCommon.solarHotWater || input === null) {
    return new SolarHotWaterNoop();
  } else {
    return new SolarHotWaterEnabled(input, dependencies);
  }
}
