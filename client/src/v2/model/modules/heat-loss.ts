import { cache } from '../../helpers/cache-decorators';
import { Result } from '../../helpers/result';
import { WithWarnings } from '../../helpers/with-warnings';
import { Month } from '../enums/month';
import { FabricError, FabricWarning } from './fabric';

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
        heatLoss: WithWarnings<Result<number, FabricError>, FabricWarning>;
    };
};

export type HeatLossError = FabricError | 'unspecified heat loss error';
export type HeatLossWarning = FabricWarning | 'unspecified heat loss warning';

export class HeatLoss {
    constructor(_input: null, private dependencies: HeatLossDependencies) {}

    heatLossMonthly(
        month: Month,
    ): WithWarnings<Result<number, HeatLossError>, HeatLossWarning> {
        return this.dependencies.fabric.heatLoss.map((fabricHeatLoss) =>
            fabricHeatLoss.map(
                (fabricHeatLoss) =>
                    fabricHeatLoss +
                    this.dependencies.ventilation.heatLossMonthly(month) +
                    this.dependencies.infiltration.heatLossMonthly(month),
            ),
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
        data.totalWK_monthly = Month.all.map((m): number =>
            this.heatLossMonthly(m)
                .unwrap(() => undefined)
                .mapErr(() => NaN)
                .coalesce(),
        );
        data.ventilation.SAP_ventilation_WK = Month.all.map((m): number =>
            this.sapVentilationHeatLossMonthly(m),
        );
        data.ventilation.average_WK = this.averageVentilationInfiltrationHeatLoss;
    }
    /* eslint-enable */
}
