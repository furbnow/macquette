import { Scenario } from '../../data-schemas/scenario';
import { cache, cacheMonth } from '../../helpers/cache-decorators';
import { sum } from '../../helpers/sum';
import { solarHotWaterOvershadingFactor } from '../datasets';
import { Month } from '../enums/month';
import { Orientation } from '../enums/orientation';
import { Overshading } from '../enums/overshading';
import { Region } from '../enums/region';
import {
    calculateSolarRadiationAnnual,
    calculateSolarRadiationMonthly,
} from '../solar-flux';

type CollectorParameters =
    | {
          source: 'test certificate';
          zeroLossEfficiency: number;
          linearHeatLossCoefficient: number;
          secondOrderHeatLossCoefficient: number;
      }
    | {
          source: 'estimate';
          collectorType: 'evacuated tube' | 'flat plate, glazed' | 'unglazed';
          apertureAreaType: 'exact' | 'gross';
      };

export type SolarHotWaterInput =
    | 'incomplete input'
    | {
          collector: {
              apertureArea: number;
              parameters: CollectorParameters;
              orientation: Orientation;
              inclination: number;
              overshading: Overshading;
          };
          dedicatedSolarStorageVolume: number;
          combinedCylinderVolume: number | null;
      };

export const extractSolarHotWaterInputFromLegacy = (
    data: Scenario,
): SolarHotWaterInput => {
    if (data.SHW === undefined) {
        return 'incomplete input';
    }
    const { collector, combinedCylinderVolume, dedicatedSolarStorageVolume } =
        data.SHW.input;
    const {
        apertureArea,
        parameterSource,
        testCertificate,
        estimate,
        orientation: orientationName,
        inclination,
        overshading: overshadingName,
    } = collector;
    let overshading: Overshading;
    if (overshadingName === null) {
        return 'incomplete input';
    } else {
        overshading = new Overshading(overshadingName);
    }
    let orientation: Orientation;
    if (orientationName === null) {
        return 'incomplete input';
    } else {
        orientation = new Orientation(orientationName);
    }
    if (
        apertureArea === null ||
        parameterSource === null ||
        inclination === null ||
        dedicatedSolarStorageVolume === null
    ) {
        return 'incomplete input';
    }

    let collectorParameters: CollectorParameters;
    switch (parameterSource) {
        case 'test certificate': {
            const {
                zeroLossEfficiency,
                linearHeatLossCoefficient,
                secondOrderHeatLossCoefficient,
            } = testCertificate;
            if (
                zeroLossEfficiency === null ||
                linearHeatLossCoefficient === null ||
                secondOrderHeatLossCoefficient === null
            ) {
                return 'incomplete input';
            }
            collectorParameters = {
                source: 'test certificate',
                zeroLossEfficiency,
                linearHeatLossCoefficient,
                secondOrderHeatLossCoefficient,
            };
            break;
        }
        case 'estimate': {
            const { collectorType, apertureAreaType } = estimate;
            if (collectorType === null || apertureAreaType === null) {
                return 'incomplete input';
            }
            collectorParameters = {
                source: 'estimate',
                collectorType,
                apertureAreaType,
            };
            break;
        }
        case undefined: {
            return 'incomplete input';
        }
    }
    return {
        collector: {
            apertureArea,
            parameters: collectorParameters,
            inclination,
            orientation,
            overshading,
        },
        combinedCylinderVolume,
        dedicatedSolarStorageVolume,
    };
};

export type SolarHotWaterDependencies = {
    region: Region;
    waterCommon: {
        dailyHotWaterUsageMeanAnnual: number;
        hotWaterEnergyContentByMonth: (month: Month) => number;
        hotWaterEnergyContentAnnual: number;
        solarHotWater: boolean;
    };
};

export type SolarHotWater = SolarHotWaterEnabled | SolarHotWaterNoop;

class SolarHotWaterEnabled {
    constructor(
        private input: Exclude<
            SolarHotWaterInput,
            'module disabled' | 'incomplete input'
        >,
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
            orientation,
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
        if (combinedCylinderVolume === null || combinedCylinderVolume <= 0) {
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
            this.dependencies.waterCommon.dailyHotWaterUsageMeanAnnual
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
                    calculateSolarRadiationMonthly(region, orientation, inclination, m),
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
            calculateSolarRadiationMonthly(region, orientation, inclination, month) /
            this.averageSolarRadiationAnnual;
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

class SolarHotWaterNoop {
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
    }
    /* eslint-enable */
}

export const constructSolarHotWater = (
    input: SolarHotWaterInput,
    dependencies: SolarHotWaterDependencies,
): SolarHotWaterEnabled | SolarHotWaterNoop => {
    if (!dependencies.waterCommon.solarHotWater || input === 'incomplete input') {
        return new SolarHotWaterNoop();
    } else {
        return new SolarHotWaterEnabled(input, dependencies);
    }
};
