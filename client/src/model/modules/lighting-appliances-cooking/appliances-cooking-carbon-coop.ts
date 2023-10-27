import _ from 'lodash';

import { Scenario } from '../../../data-schemas/scenario';
import { coalesceEmptyString } from '../../../data-schemas/scenario/value-schemas';
import { TypeOf, t } from '../../../data-schemas/visitable-types';
import { sum } from '../../../helpers/array-reducers';
import { cache } from '../../../helpers/cache-decorators';
import { Month } from '../../enums/month';
import { ModelError } from '../../error';
import { ModelBehaviourFlags } from '../behaviour-version';

const fuelType = t.enum(['electricity', 'gas', 'oil']);
export type FuelType = TypeOf<typeof fuelType>;

// Since cookers and other appliances are counted separately, but share the
// same individual model, we refer to them generically as a "load"
const loadInput = t.struct({
  numberUsed: t.number(),
  aPlusRated: t.boolean(),

  // kWh per (1 year)/annualUseFrequency, so if annualUseFrequency = 365, this is kWh per day
  normalisedDemand: t.number(),

  utilisationFactor: t.number(),
  referenceQuantity: t.number(),
  annualUseFrequency: t.number(),
  fuel: t.struct({ type: fuelType, name: t.string(), efficiency: t.number() }),
  category: t.enum(['appliances', 'cooking']),
});
type LoadInput = TypeOf<typeof loadInput>;

export const appliancesCookingCarbonCoopInput = t.array(loadInput);
export type AppliancesCookingCarbonCoopInput = TypeOf<
  typeof appliancesCookingCarbonCoopInput
>;

export function extractAppliancesCarbonCoopInputFromLegacy(
  scenario: Scenario,
): AppliancesCookingCarbonCoopInput {
  return (
    scenario?.applianceCarbonCoop?.list?.map((item): LoadInput => {
      const fuelEfficiency = coalesceEmptyString(item.efficiency, 1);
      let fuelType: FuelType;
      switch (item.type_of_fuel) {
        case 'Electricity':
          if (fuelEfficiency !== 1) {
            console.warn(
              'Found an electrical load (appliance or cooker) that had a fuel efficiency other than 1.',
            );
          }
          fuelType = 'electricity';
          break;
        case 'Gas':
          fuelType = 'gas';
          break;
        case 'Oil':
          fuelType = 'oil';
          break;
      }
      return {
        numberUsed: coalesceEmptyString(item.number_used, 0),
        aPlusRated: item.a_plus_rated ?? false,
        normalisedDemand: coalesceEmptyString(item.norm_demand, 0),
        utilisationFactor: coalesceEmptyString(item.utilisation_factor, 1),
        referenceQuantity: coalesceEmptyString(item.reference_quantity, 1),
        annualUseFrequency: coalesceEmptyString(item.frequency, 1),
        fuel: {
          type: fuelType,
          name: item.fuel,
          efficiency: fuelEfficiency,
        },
        category:
          item.category === 'Cooking' || item.category === 'cooking'
            ? 'cooking'
            : 'appliances',
      };
    }) ?? []
  );
}

export type AppliancesCookingCarbonCoopDependencies = {
  fuels: {
    names: string[];
  };
  modelBehaviourFlags: Pick<ModelBehaviourFlags, 'carbonCoopAppliancesCooking'>;
};

export class AppliancesCookingCarbonCoop {
  cooking: LoadCollection;
  appliances: LoadCollection;
  constructor(
    input: AppliancesCookingCarbonCoopInput,
    dependencies: AppliancesCookingCarbonCoopDependencies,
  ) {
    const withIndices = input.map((loadInput, index) => ({
      ...loadInput,
      originalIndex: index,
    }));
    this.cooking = new LoadCollection(
      withIndices.filter((i) => i.category === 'cooking'),
      dependencies,
    );
    this.appliances = new LoadCollection(
      withIndices.filter((i) => i.category === 'appliances'),
      dependencies,
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
    const { applianceCarbonCoop } = data;
    for (const load of [...this.appliances.loads, ...this.cooking.loads]) {
      const legacyLoad = applianceCarbonCoop.list[load.input.originalIndex];
      legacyLoad.energy_demand = load.energyDemandAnnual;
      legacyLoad.fuel_input = load.fuelInputAnnual;
    }
    applianceCarbonCoop.energy_demand_total = {
      appliances: this.appliances.energyDemandAnnual,
      cooking: this.cooking.energyDemandAnnual,
      total: this.appliances.energyDemandAnnual + this.cooking.energyDemandAnnual,
    };
    applianceCarbonCoop.energy_demand_monthly = {
      appliances: Month.all.map((m) => this.appliances.energyDemandMonthly(m)),
      cooking: Month.all.map((m) => this.cooking.energyDemandMonthly(m)),
      total: Month.all.map(
        (m) =>
          this.appliances.energyDemandMonthly(m) + this.cooking.energyDemandMonthly(m),
      ),
    };
    applianceCarbonCoop.energy_demand_by_type_of_fuel['Electricity'] =
      this.appliances.energyDemandAnnualByFuelType('electricity') +
      this.cooking.energyDemandAnnualByFuelType('electricity');
    applianceCarbonCoop.energy_demand_by_type_of_fuel['Gas'] =
      this.appliances.energyDemandAnnualByFuelType('gas') +
      this.cooking.energyDemandAnnualByFuelType('gas');
    applianceCarbonCoop.energy_demand_by_type_of_fuel['Oil'] =
      this.appliances.energyDemandAnnualByFuelType('oil') +
      this.cooking.energyDemandAnnualByFuelType('oil');

    const { energy_requirements } = data;
    energy_requirements.appliances = {
      name: 'Appliances',
      quantity: this.appliances.energyDemandAnnual,
      monthly: Month.all.map((m) => this.appliances.energyDemandMonthly(m)),
    };
    energy_requirements.cooking = {
      name: 'Cooking',
      quantity: this.cooking.energyDemandAnnual,
      monthly: Month.all.map((m) => this.cooking.energyDemandMonthly(m)),
    };

    const { gains_W } = data;
    gains_W['Appliances'] = Month.all.map((m) =>
      this.appliances.heatGainAverageMonthly(m),
    );
    gains_W['Cooking'] = Month.all.map((m) => this.cooking.heatGainAverageMonthly(m));

    applianceCarbonCoop.fuel_input_total['appliances'] = this.appliances.fuelInputAnnual;
    applianceCarbonCoop.fuel_input_total['cooking'] = this.cooking.fuelInputAnnual;

    const { fuel_requirements } = data;
    fuel_requirements['appliances'].quantity = this.appliances.fuelInputAnnual;
    fuel_requirements['cooking'].quantity = this.cooking.fuelInputAnnual;

    fuel_requirements['appliances'].list = Object.entries(
      this.appliances.fuelInfoAnnualByFuel,
    ).map(([fuel, { energyDemand, fuelInput, fraction }]) => ({
      fuel,
      demand: energyDemand,
      fuel_input: fuelInput,
      fraction,
    }));
    fuel_requirements['cooking'].list = Object.entries(
      this.cooking.fuelInfoAnnualByFuel,
    ).map(([fuel, { energyDemand, fuelInput, fraction }]) => ({
      fuel,
      demand: energyDemand,
      fuel_input: fuelInput,
      fraction,
    }));
  }
  /* eslint-enable */
}

class LoadCollection {
  public loads: Array<Load>;
  private flags: ModelBehaviourFlags['carbonCoopAppliancesCooking'];

  constructor(
    public input: Array<LoadInput & { originalIndex: number }>,
    dependencies: AppliancesCookingCarbonCoopDependencies,
  ) {
    const uniqueCategories = _.uniq(input.map((item) => item.category));
    if (uniqueCategories.length > 1) {
      throw new ModelError(
        'Must only construct a load collection with a single category',
        { uniqueCategories },
      );
    }
    this.loads = input.map((i) => new Load(i, dependencies));
    this.flags = dependencies.modelBehaviourFlags.carbonCoopAppliancesCooking;
  }

  @cache
  get energyDemandAnnual(): number {
    return sum(this.loads.map((load) => load.energyDemandAnnual));
  }

  energyDemandMonthly(month: Month): number {
    if (this.flags.useWeightedMonthsForEnergyDemand) {
      return this.energyDemandAnnual * (month.days / 365);
    } else {
      return this.energyDemandAnnual / Month.all.length;
    }
  }

  energyDemandAnnualByFuelType(fuelType: FuelType): number {
    return sum(
      this.loads
        .filter((load) => load.input.fuel.type === fuelType)
        .map((load) => load.energyDemandAnnual),
    );
  }

  // Watts
  get heatGainAverageAnnual(): number {
    if (this.flags.convertGainsToWatts) {
      const kWhPerYearToWatts = 1000 / (24 * 365);
      // Is it right to assume that the heat gain is equal to the power
      // input? Surely not in the case of e.g. a dishwasher which empties
      // hot water into drains etc.
      return this.energyDemandAnnual * kWhPerYearToWatts;
    } else {
      console.warn(
        'Reproducing buggy behaviour in appliances & cooking gains calculation. (convertGainsToWatts)',
      );
      return this.energyDemandAnnual;
    }
  }

  heatGainAverageMonthly(month: Month): number {
    // Gain is expressed in power (Watts) and therefore expresses a rate,
    // meaning we should not divide by 12 here as we would with energy.
    //
    // If you sail around the world in a year and you sail at an annual
    // average speed of 12 knots, how many knots on average do you do a
    // month? Correct answer: 12 knots. Incorrect answer: 1 knot.

    if (this.flags.treatMonthlyGainAsPower) {
      return this.heatGainAverageAnnual;
    } else {
      console.warn(
        'Reproducing buggy behaviour in appliances & cooking gains calculation. (treatMonthlyGainAsPower)',
      );
      return (this.heatGainAverageAnnual * month.days) / 365.0;
    }
  }

  @cache
  get fuelInputAnnual(): number {
    return sum(this.loads.map((app) => app.fuelInputAnnual));
  }

  @cache
  get fuelInfoAnnualByFuel(): Record<
    string,
    { energyDemand: number; fuelInput: number; fraction: number }
  > {
    return _.chain(this.loads)
      .groupBy((load): string => load.input.fuel.name)
      .mapValues((loads) => {
        const energyDemand = sum(loads.map((load) => load.energyDemandAnnual));
        const fuelInput = sum(loads.map((load) => load.fuelInputAnnual));
        let fraction;
        if (fuelInput !== energyDemand && !this.flags.useFuelInputForFuelFraction) {
          console.warn(
            'Reproducing buggy fuel fraction calc. (useFuelInputForFuelFraction)',
          );
          fraction = energyDemand / this.fuelInputAnnual;
        } else {
          fraction = fuelInput / this.fuelInputAnnual;
        }
        return {
          energyDemand,
          fuelInput,
          fraction,
        };
      })
      .value();
  }
}

class Load {
  constructor(
    public input: LoadInput & { originalIndex: number },
    { fuels }: AppliancesCookingCarbonCoopDependencies,
  ) {
    if (!fuels.names.includes(input.fuel.name)) {
      throw new ModelError('Load (appliance or cooker) had an invalid fuel name', {
        input,
        fuels,
      });
    }
  }

  get energyDemandAnnual(): number {
    let performanceModifier;
    if (this.input.fuel.type === 'electricity' && this.input.aPlusRated) {
      performanceModifier = 0.75;
    } else {
      performanceModifier = 1.0;
    }
    return (
      performanceModifier *
      this.input.numberUsed *
      this.input.normalisedDemand *
      this.input.utilisationFactor *
      this.input.referenceQuantity *
      this.input.annualUseFrequency
    );
  }

  get fuelInputAnnual(): number {
    return this.energyDemandAnnual / this.input.fuel.efficiency;
  }
}
