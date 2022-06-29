import { Scenario } from '../../data-schemas/scenario';
import { sum } from '../../helpers/array-reducers';
import { cache, cacheMonth } from '../../helpers/cache-decorators';
import { isTruthy } from '../../helpers/is-truthy';
import { monthlyHotWaterTemperatureRise, monthlyHotWaterUseFactor } from '../datasets';
import { Month } from '../enums/month';
import { ModelError } from '../error';

export type WaterCommonInput = {
    lowWaterUseDesign: boolean;
    annualEnergyContentOverride: false | number;
    solarHotWater: boolean;
};

export function extractWaterCommonInputFromLegacy(scenario: Scenario): WaterCommonInput {
    const {
        low_water_use_design,
        annual_energy_content,
        override_annual_energy_content,
    } = scenario.water_heating ?? {};
    let annualEnergyContentOverride: false | number;
    if (!isTruthy(override_annual_energy_content)) {
        annualEnergyContentOverride = false;
    } else if (typeof annual_energy_content === 'number') {
        annualEnergyContentOverride = annual_energy_content;
    } else {
        throw new ModelError('Specified annual energy content override with no value', {
            annual_energy_content,
            override_annual_energy_content,
        });
    }
    const solarHotWater =
        isTruthy(scenario.use_SHW) ||
        isTruthy(scenario.water_heating?.solar_water_heating);
    return {
        lowWaterUseDesign: low_water_use_design === true || low_water_use_design === 1,
        annualEnergyContentOverride,
        solarHotWater,
    };
}

type WaterCommonDependencies = {
    occupancy: {
        occupancy: number;
    };
};

export class WaterCommon {
    constructor(
        private input: WaterCommonInput,
        private dependencies: WaterCommonDependencies,
    ) {}

    get solarHotWater(): boolean {
        return this.input.solarHotWater;
    }

    get annualEnergyContentOverride(): false | number {
        return this.input.annualEnergyContentOverride;
    }

    @cache
    get dailyHotWaterUsageMeanAnnual() {
        const lowWaterUseModifier = this.input.lowWaterUseDesign ? 0.95 : 1;
        return lowWaterUseModifier * (25 * this.dependencies.occupancy.occupancy + 36);
    }

    @cacheMonth
    dailyHotWaterUsageByMonth(month: Month) {
        const usageFactor = monthlyHotWaterUseFactor(month);
        return usageFactor * this.dailyHotWaterUsageMeanAnnual;
    }

    // kWh per month
    @cacheMonth
    hotWaterEnergyContentByMonth(month: Month) {
        if (this.input.annualEnergyContentOverride !== false) {
            /* Dubious non-SAP calculation here. Even if we know the annual
               energy content, surely it's not the same every month --
               different numbers of days, required temperature rises, etc.
             */
            const usageFactor = monthlyHotWaterUseFactor(month);
            return (usageFactor * this.input.annualEnergyContentOverride) / 12;
        }
        const dailyVolume = this.dailyHotWaterUsageByMonth(month);
        const temperatureRise = monthlyHotWaterTemperatureRise(month);
        return (4.18 * dailyVolume * month.days * temperatureRise) / 3600;
    }

    @cache
    get hotWaterEnergyContentAnnual() {
        if (this.input.annualEnergyContentOverride !== false) {
            return this.input.annualEnergyContentOverride;
        } else {
            return sum(
                Month.all.map((month) => this.hotWaterEnergyContentByMonth(month)),
            );
        }
    }

    /* eslint-disable
        @typescript-eslint/no-explicit-any,
        @typescript-eslint/no-unsafe-member-access,
        @typescript-eslint/no-unsafe-assignment
    */
    mutateLegacyData(data: any) {
        data.water_heating = data.water_heating ?? {};
        data.water_heating.Vd_average = this.dailyHotWaterUsageMeanAnnual;
        data.water_heating.monthly_energy_content = Month.all.map((m) =>
            this.hotWaterEnergyContentByMonth(m),
        );
        if (this.input.annualEnergyContentOverride === false) {
            data.water_heating.annual_energy_content = this.hotWaterEnergyContentAnnual;
        }
    }
    /* eslint-enable */
}
