import { z } from 'zod';
import { scenarioSchema } from '../../../data-schemas/scenario';
import { sum } from '../../../helpers/array-reducers';
import { Month } from '../../enums/month';

export type FansAndPumpsGainsDependencies = {
  heatingSystems: {
    fansAndPumpsHeatingSystems: Array<{ heatGain: (m: Month) => number }>;
  };
  ventilation: {
    fanHeatGain: number;
  };
};
export class FansAndPumpsGains {
  constructor(
    _input: null,
    private dependencies: FansAndPumpsGainsDependencies,
  ) {}

  heatingSystemsHeatGain(month: Month): number {
    return sum(
      this.dependencies.heatingSystems.fansAndPumpsHeatingSystems.map((system) =>
        system.heatGain(month),
      ),
    );
  }

  get ventilationHeatGain(): number {
    return this.dependencies.ventilation.fanHeatGain;
  }

  heatGain(month: Month): number {
    return this.heatingSystemsHeatGain(month) + this.ventilationHeatGain;
  }

  mutateLegacyData(data: z.input<typeof scenarioSchema>) {
    const gains_W = data?.gains_W;
    if (gains_W === undefined) return;
    gains_W.fans_and_pumps = Month.all.map((m) => this.heatGain(m));
  }
}
