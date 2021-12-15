import { cache } from '../../helpers/cache-decorators';
import { Month } from '../enums/month';

export type HeatLossDependencies = {
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

    /* eslint-disable
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-argument,
       @typescript-eslint/no-unsafe-assignment,
       @typescript-eslint/no-unsafe-member-access,
       @typescript-eslint/consistent-type-assertions,
    */
    mutateLegacyData(data: any) {
        data.totalWK_monthly = Month.all.map((m) => this.heatLossMonthly(m));
        data.ventilation.SAP_ventilation_WK = Month.all.map((m) =>
            this.sapVentilationHeatLossMonthly(m),
        );
        data.ventilation.average_WK = this.averageVentilationInfiltrationHeatLoss;
    }
    /* eslint-enable */
}
