import { z } from 'zod';
import { scenarioSchema } from '../../../data-schemas/scenario';
import { sum } from '../../../helpers/array-reducers';
import { Month } from '../../enums/month';

export type FansAndPumpsGainsDependencies = {
  heatingSystems: {
    fansAndPumpsHeatingSystems: Array<{ heatGain: number }>;
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

  get heatingSystemsHeatGain(): number {
    return sum(
      this.dependencies.heatingSystems.fansAndPumpsHeatingSystems.map(
        (system) => system.heatGain,
      ),
    );
  }

  get ventilationHeatGain(): number {
    return this.dependencies.ventilation.fanHeatGain;
  }

  get heatGain(): number {
    return this.heatingSystemsHeatGain + this.ventilationHeatGain;
  }

  mutateLegacyData(data: z.input<typeof scenarioSchema>) {
    const gains_W = data?.gains_W;
    if (gains_W === undefined) return;
    gains_W.fans_and_pumps = Month.all.map(() => this.heatGain);
  }
}
