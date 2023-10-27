import { Month } from '../enums/month';

export type AirChangerateDependencies = {
  ventilation: { airChangesPerHour: (m: Month) => number };
  infiltration: { airChangesPerHour: (m: Month) => number };
};

export class AirChangeRate {
  constructor(
    _input: null,
    private dependencies: AirChangerateDependencies,
  ) {}

  totalAirChangeRate(month: Month): number {
    return (
      this.dependencies.infiltration.airChangesPerHour(month) +
      this.dependencies.ventilation.airChangesPerHour(month)
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
    data.ventilation.effective_air_change_rate = Month.all.map((m) =>
      this.totalAirChangeRate(m),
    );
  }
  /* eslint-enable */
}
