import { z } from 'zod';
import { scenarioSchema } from '../../../data-schemas/scenario';
import { Month } from '../../enums/month';

export type InternalLossesDependencies = {
  occupancy: { occupancy: number };
};

export class InternalLosses {
  constructor(
    _input: null,
    private dependencies: InternalLossesDependencies,
  ) {}

  get heatLossPower(): number {
    // Unlike SAP we return a positive loss here, rather than a negative gain
    return 40 * this.dependencies.occupancy.occupancy;
  }

  mutateLegacyData(data: z.input<typeof scenarioSchema>) {
    const gains_W = data?.gains_W;
    if (gains_W === undefined) return;
    gains_W.losses = Month.all.map(() => -this.heatLossPower);
  }
}
