import { cache, cacheMonth } from '../../helpers/cache-decorators';
import { throwForNull } from '../../helpers/null-wrapping';
import { sum } from '../../helpers/sum';
import { coalesceEmptyString } from '../../legacy-state-validators/numericValues';
import { LegacyScenario } from '../../legacy-state-validators/scenario';
import {
    solarHotWaterOvershadingFactor,
    solarHotWaterOvershadingFactorReverse,
} from '../datasets';
import { Month } from '../enums/month';
import { Orientation } from '../enums/orientation';
import { Overshading } from '../enums/overshading';
import { Region } from '../enums/region';
import { ModelError } from '../error';
import {
    calculateSolarRadiationAnnual,
    calculateSolarRadiationMonthly,
} from '../solar-flux';

export type SolarHotWaterInput =
    | 'module disabled'
    | 'incomplete input'
    | {
          solarCollectorApertureArea: number;
          zeroLossCollectorEfficiency: number;
          collectorLinearHeatLossCoefficient: number;
          collectorSecondOrderHeatLossCoefficient: number;
          collectorOrientation: Orientation;
          collectorInclination: number;
          overshading: Overshading;
          dedicatedSolarStorageVolume: number;
          combinedCylinderVolume: number;
      };

export const extractSolarHotWaterInputFromLegacy = (
    data: LegacyScenario,
): SolarHotWaterInput => {
    if (!(data.use_SHW || data.water_heating?.solar_water_heating)) {
        return 'module disabled';
    }
    const {
        a1,
        a2,
        n0,
        orientation: orientationInput,
        overshading: overshadingInput,
        inclination,
        A,
        combined_cylinder_volume,
        Vs,
    } = data.SHW ?? {};
    let overshading: Overshading;
    if (overshadingInput === undefined) {
        return 'incomplete input';
    } else {
        overshading = throwForNull(
            solarHotWaterOvershadingFactorReverse,
            () =>
                new ModelError(
                    `Factor ${overshadingInput} was not a valid overshading factor for SHW`,
                ),
        )(overshadingInput);
    }
    let collectorOrientation: Orientation;
    if (orientationInput === undefined) {
        return 'incomplete input';
    } else {
        collectorOrientation = Orientation.fromIndex0(orientationInput);
    }
    if (
        inclination === undefined ||
        a1 === undefined ||
        a2 === undefined ||
        combined_cylinder_volume === undefined ||
        Vs === undefined ||
        A === undefined ||
        n0 === undefined
    ) {
        return 'incomplete input';
    }
    return {
        collectorInclination: inclination,
        collectorLinearHeatLossCoefficient: coalesceEmptyString(a1, 0),
        collectorOrientation,
        collectorSecondOrderHeatLossCoefficient: coalesceEmptyString(a2, 0),
        combinedCylinderVolume: combined_cylinder_volume,
        dedicatedSolarStorageVolume: Vs,
        overshading,
        solarCollectorApertureArea: A,
        zeroLossCollectorEfficiency: n0,
    };
};

export type SolarHotWaterDependencies = {
    region: Region;
    waterCommon: {
        dailyHotWaterUsageMeanAnnual: number;
        hotWaterEnergyContentByMonth: (month: Month) => number;
        hotWaterEnergyContentAnnual: number;
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

    get aStar(): number {
        const {
            collectorLinearHeatLossCoefficient,
            collectorSecondOrderHeatLossCoefficient,
        } = this.input;
        return (
            0.892 *
            (collectorLinearHeatLossCoefficient +
                45 * collectorSecondOrderHeatLossCoefficient)
        );
    }

    get collectorPerformanceRatio(): number {
        return this.aStar / this.input.zeroLossCollectorEfficiency;
    }

    @cache
    get solarRadiationAnnual(): number {
        const { collectorOrientation, collectorInclination } = this.input;
        if (collectorOrientation === null || collectorInclination === null) {
            return NaN;
        }
        return calculateSolarRadiationAnnual(
            this.dependencies.region,
            collectorOrientation,
            collectorInclination,
        );
    }

    get solarEnergyAvailable(): number {
        const { solarCollectorApertureArea, zeroLossCollectorEfficiency, overshading } =
            this.input;
        if (overshading === null) {
            return 0;
        }
        return (
            solarCollectorApertureArea *
            zeroLossCollectorEfficiency *
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
        const { collectorOrientation, collectorInclination } = this.input;
        if (collectorOrientation === null) {
            return NaN;
        }
        return (
            sum(
                Month.all.map((m) =>
                    calculateSolarRadiationMonthly(
                        region,
                        collectorOrientation,
                        collectorInclination,
                        m,
                    ),
                ),
            ) / 12
        );
    }

    @cacheMonth
    solarInputMonthly(month: Month): number | null {
        const { region } = this.dependencies;
        const { collectorOrientation, collectorInclination } = this.input;
        if (collectorOrientation === null) {
            return 0;
        }
        const monthSolarRadiationWeight =
            calculateSolarRadiationMonthly(
                region,
                collectorOrientation,
                collectorInclination,
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
    if (input === 'module disabled' || input === 'incomplete input') {
        return new SolarHotWaterNoop();
    } else {
        return new SolarHotWaterEnabled(input, dependencies);
    }
};
