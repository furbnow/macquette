import { Scenario } from '../../../data-schemas/scenario';
import { sum } from '../../../helpers/array-reducers';
import { cache, cacheMonth } from '../../../helpers/cache-decorators';
import { isTruthy } from '../../../helpers/is-truthy';
import { Month } from '../../enums/month';
import { Fuels } from '../fuels';
import { Fuel, FuelInput } from './fuel-sap';

export type AppliancesSAPInput = {
  energyEfficient: boolean;
  fuels: FuelInput[];
};

export function extractAppliancesSAPInputFromLegacy(
  scenario: Scenario,
): AppliancesSAPInput {
  const { LAC } = scenario ?? {};
  return {
    energyEfficient: LAC?.energy_efficient_appliances ?? false,
    fuels: LAC?.fuels_appliances?.map(({ fuel, fraction }) => ({
      name: fuel,
      fraction,
    })) ?? [{ name: Fuels.STANDARD_TARIFF, fraction: 1.0 }],
  };
}

export type AppliancesSAPDependencies = {
  floors: {
    totalFloorArea: number;
  };
  occupancy: {
    occupancy: number;
  };
  fuels: {
    names: string[];
  };
};

export class AppliancesSAP {
  private input: Omit<AppliancesSAPInput, 'fuels'>;
  private fuels: Fuel[];

  constructor(
    input: AppliancesSAPInput,
    private dependencies: AppliancesSAPDependencies,
  ) {
    const { fuels, ...restInput } = input;
    this.input = restInput;
    this.fuels = fuels.map((f) => new Fuel(f, dependencies));
  }

  get initialEnergyAnnual(): number {
    return (
      207.8 *
      Math.pow(
        this.dependencies.floors.totalFloorArea * this.dependencies.occupancy.occupancy,
        0.4714,
      )
    );
  }

  /** Bugs reproduced: this method does not take into account the
        energyEfficient input flag; rather, it is applied in the annual total
        method. */
  @cacheMonth
  energyMonthly(month: Month): number {
    const adjustment = 1 + 0.157 * Math.cos((2 * Math.PI * (month.index1 - 1.78)) / 12);
    const weight = month.days / 365;
    return this.initialEnergyAnnual * adjustment * weight;
  }

  get energyAnnual(): number {
    const reducedEnergyFactor = this.input.energyEfficient ? 0.9 : 1.0;
    return reducedEnergyFactor * sum(Month.all.map((m) => this.energyMonthly(m)));
  }

  @cacheMonth
  heatGainMonthly(month: Month): number {
    const reducedGainFactor = this.input.energyEfficient ? 0.67 : 1.0;
    return ((this.energyMonthly(month) * 1000) / (24 * month.days)) * reducedGainFactor;
  }

  get heatGainAnnual(): number {
    return sum(Month.all.map((m) => this.heatGainMonthly(m)));
  }

  @cache
  get fuelDemand(): Array<{ fuel: Fuel; demand: number }> {
    return this.fuels.map((fuel) => ({
      fuel,
      demand: this.energyAnnual * fuel.fraction,
    }));
  }

  get totalFuelDemand(): number {
    return sum(this.fuelDemand.map(({ demand }) => demand));
  }

  /* eslint-disable
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-argument,
       @typescript-eslint/no-unsafe-assignment,
       @typescript-eslint/no-unsafe-member-access,
       @typescript-eslint/consistent-type-assertions,
    */
  mutateLegacyData(data: any) {
    data.LAC = data.LAC ?? {};
    data.LAC.EA = this.energyAnnual;
    data.LAC.energy_efficient_appliances = this.input.energyEfficient;

    if (!isTruthy(data.LAC.fuels_appliances)) {
      data.LAC.fuels_appliances = [{ fuel: Fuels.STANDARD_TARIFF, fraction: 1 }];
    }

    if (this.energyAnnual > 0) {
      data.gains_W['Appliances'] = Month.all.map((m) => this.heatGainMonthly(m));
      data.energy_requirements = data.energy_requirements ?? {};
      data.energy_requirements.appliances = {
        name: 'Appliances',
        quantity: this.energyAnnual,
        monthly: Month.all.map((m) => this.energyMonthly(m)),
      };
      const legacyFuelDemandArray = this.fuelDemand.map(({ fuel, demand }) => ({
        fuel: fuel.name,
        fraction: fuel.fraction,
        demand,
        fuel_input: demand,
      }));
      data.LAC.fuels_appliances = legacyFuelDemandArray;
      data.fuel_requirements.appliances.list = legacyFuelDemandArray;
      data.fuel_requirements.appliances.quantity = this.totalFuelDemand;
    }
  }
  /* eslint-enable */
}
