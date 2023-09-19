import { cache } from '../../helpers/cache-decorators';
import { Month } from '../enums/month';

export type HeatLossDependencies = {
    geography: {
        externalDesignTemperature: number;
    };
    floors: {
        totalFloorArea: number;
    };
    ventilation: {
        heatLossAverage: number;
        heatLossMonthly: (month: Month) => number;
    };
    infiltration: {
        heatLossAverage: number;
        heatLossMonthly: (month: Month) => number;
    };
    fabric: {
        heatLoss: number;
    };
};

export class HeatLoss {
    constructor(_input: null, private dependencies: HeatLossDependencies) {}

    heatLossMonthly(month: Month): number {
        return (
            this.dependencies.fabric.heatLoss +
            this.dependencies.ventilation.heatLossMonthly(month) +
            this.dependencies.infiltration.heatLossMonthly(month)
        );
    }

    sapVentilationHeatLossMonthly(month: Month): number {
        return (
            this.dependencies.ventilation.heatLossMonthly(month) +
            this.dependencies.infiltration.heatLossMonthly(month)
        );
    }

    @cache
    get averageVentilationInfiltrationHeatLoss(): number {
        return (
            this.dependencies.infiltration.heatLossAverage +
            this.dependencies.ventilation.heatLossAverage
        );
    }

    get internalDesignTemperature(): number {
        // We use 20 degrees here as an average value. MCS calcs specify different
        // minimums per type of room but we can't do that.
        return 20;
    }

    get totalAverageHeatLoss(): number {
        return (
            this.dependencies.fabric.heatLoss +
            this.averageVentilationInfiltrationHeatLoss
        );
    }

    /** Peak heat load in W */
    get peakHeatLoad(): number {
        return (
            this.totalAverageHeatLoss *
            (this.internalDesignTemperature -
                this.dependencies.geography.externalDesignTemperature)
        );
    }

    /** Peak heat load, W/m² */
    get peakHeatLoadPerArea(): number {
        return this.peakHeatLoad / this.dependencies.floors.totalFloorArea;
    }

    /* eslint-disable
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-argument,
       @typescript-eslint/no-unsafe-assignment,
       @typescript-eslint/no-unsafe-member-access,
       @typescript-eslint/consistent-type-assertions,
    */
    mutateLegacyData(data: any) {
        data.totalWK_monthly = Month.all.map((m): number => this.heatLossMonthly(m));
        data.ventilation.SAP_ventilation_WK = Month.all.map((m): number =>
            this.sapVentilationHeatLossMonthly(m),
        );
        data.ventilation.average_WK = this.averageVentilationInfiltrationHeatLoss;
    }
    /* eslint-enable */
}
