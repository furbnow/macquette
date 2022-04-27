import { Scenario } from '../../../data-schemas/scenario';
import { windSpeed } from '../../datasets';
import { Month } from '../../enums/month';
import { Region } from '../../enums/region';

export const extractVentilationInfiltrationCommonInputFromLegacy = (
    scenario: Scenario,
): VentilationInfiltrationCommonInput => ({
    numberOfSidesSheltered: scenario.ventilation?.number_of_sides_sheltered ?? 0,
});

export type VentilationInfiltrationCommonInput = {
    numberOfSidesSheltered: number;
};

export class VentilationInfiltrationCommon {
    constructor(
        public input: VentilationInfiltrationCommonInput,
        private dependencies: { region: Region },
    ) {}

    get shelterFactor(): number {
        return 1 - 0.075 * this.input.numberOfSidesSheltered;
    }

    windFactor(month: Month): number {
        return windSpeed(this.dependencies.region, month) / 4;
    }

    /* eslint-disable
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-argument,
       @typescript-eslint/no-unsafe-assignment,
       @typescript-eslint/no-unsafe-member-access,
       @typescript-eslint/consistent-type-assertions,
    */
    mutateLegacyData(data: any) {
        data.ventilation.windfactor = Month.all.map((m) => this.windFactor(m));
    }
    /* eslint-enable */
}
