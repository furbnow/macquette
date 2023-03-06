import { z } from 'zod';
import { scenarioSchema } from '../../../data-schemas/scenario';
import { Month } from '../../enums/month';

export type MetabolicGainsDependencies = {
    occupancy: { occupancy: number };
};

export class MetabolicGains {
    constructor(_input: null, private dependencies: MetabolicGainsDependencies) {}

    get heatGainPower(): number {
        // SAP Table 5
        return 60 * this.dependencies.occupancy.occupancy;
    }

    mutateLegacyData(data: z.input<typeof scenarioSchema>) {
        const gains_W = data?.gains_W;
        if (gains_W === undefined) return;
        gains_W.metabolic = Month.all.map(() => this.heatGainPower);
    }
}
