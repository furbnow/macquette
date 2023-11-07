import { z } from 'zod';
import { scenarioSchema } from '../../../data-schemas/scenario';
import { Month } from '../../enums/month';

export type MiscellaneousInternalGainsDependencies = {
  occupancy: { occupancy: number };
};

export class MiscellaneousInternalGains {
  constructor(
    _input: null,
    private dependencies: MiscellaneousInternalGainsDependencies,
  ) {}

  get metabolicHeatGainPower(): number {
    // SAP Table 5
    // We always use Column A ("Typical")
    return 60 * this.dependencies.occupancy.occupancy;
  }

  get miscellaneousHeatLossPower(): number {
    // Unlike SAP we return a positive loss here, rather than a negative gain
    return 40 * this.dependencies.occupancy.occupancy;
  }

  mutateLegacyData(data: z.input<typeof scenarioSchema>) {
    const gains_W = data?.gains_W;
    if (gains_W === undefined) return;
    gains_W.metabolic = Month.all.map(() => this.metabolicHeatGainPower);
    gains_W.losses = Month.all.map(() => -this.miscellaneousHeatLossPower);
  }
}
