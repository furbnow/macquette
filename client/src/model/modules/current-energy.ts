import { mapValues } from 'lodash';
import { z } from 'zod';
import { Scenario, scenarioSchema } from '../../data-schemas/scenario';
import { coalesceEmptyString } from '../../data-schemas/scenario/value-schemas';
import { sum } from '../../helpers/array-reducers';
import { cache } from '../../helpers/cache-decorators';
import { ModelBehaviourFlags } from './behaviour-version';
import { Fuel } from './fuels';

type CurrentEnergyDependencyFuel = Pick<
  Fuel,
  'carbonEmissionsFactor' | 'primaryEnergyFactor' | 'unitPrice' | 'standingCharge'
>;

export type CurrentEnergyDependencies = {
  fuels: {
    fuels: Record<string, CurrentEnergyDependencyFuel>;
    generation: CurrentEnergyDependencyFuel;
  };
  modelBehaviourFlags: Pick<ModelBehaviourFlags, 'currentEnergy'>;
};

export type CurrentEnergyInput = {
  annualEnergyByFuel: Record<string, number>; // fuel name -> kWh
  generation: null | GenerationInput;
};

export function extractCurrentEnergyInputFromLegacy(
  scenario: Scenario,
): CurrentEnergyInput {
  const { currentenergy } = scenario ?? {};
  const annualUseByFuel = mapValues(
    currentenergy?.use_by_fuel ?? {},
    (legacyFuel): number => coalesceEmptyString(legacyFuel.annual_use, 0),
  );
  let generationInput: GenerationInput | null;
  if (currentenergy?.onsite_generation === 1) {
    const { generation } = currentenergy ?? {};
    generationInput = {
      annualEnergy: coalesceEmptyString(generation?.annual_generation, 0) ?? 0,
      fractionUsedOnsite: coalesceEmptyString(generation?.fraction_used_onsite, 0) ?? 0,
      annualFeedInTariffIncome:
        coalesceEmptyString(generation?.annual_FIT_income, 0) ?? 0,
    };
  } else {
    generationInput = null;
  }
  return { annualEnergyByFuel: annualUseByFuel, generation: generationInput };
}

export class CurrentEnergy {
  constructor(
    public input: CurrentEnergyInput,
    private dependencies: CurrentEnergyDependencies,
  ) {}

  @cache
  get fuels(): Record<string, CurrentEnergyFuel> {
    const out: Record<string, CurrentEnergyFuel> = {};
    for (const [fuelName, annualUse] of Object.entries(this.input.annualEnergyByFuel)) {
      const fuel = this.dependencies.fuels.fuels[fuelName];
      if (fuel === undefined) {
        console.warn(
          'Current energy input referenced a fuel that did not exist: ' + fuelName,
        );
      } else {
        out[fuelName] = new CurrentEnergyFuel(annualUse, fuel);
      }
    }
    return out;
  }

  @cache
  get generation(): CurrentEnergyGeneration | null {
    if (this.input.generation === null) return null;
    return new CurrentEnergyGeneration(this.input.generation, this.dependencies);
  }

  // kg CO_2
  get annualCarbonEmissions(): number {
    const correctValue = sum(
      Object.values(this.fuels).map((fuel) => fuel.annualCarbonEmissions),
    );
    if (
      this.dependencies.modelBehaviourFlags.currentEnergy.countSavingsCorrectlyInUsage
    ) {
      return correctValue;
    } else if (this.input.generation === null) {
      return correctValue;
    } else {
      // Miscount savings for compatibility with legacy
      const error =
        (this.input.generation.fractionUsedOnsite - 1) *
        this.dependencies.fuels.generation.carbonEmissionsFactor *
        this.input.generation.annualEnergy;
      return correctValue + error;
    }
  }

  // £
  get annualGrossCost(): number {
    return sum(Object.values(this.fuels).map((fuel) => fuel.annualCost));
  }

  get annualNetCost(): number {
    return this.annualGrossCost - (this.input.generation?.annualFeedInTariffIncome ?? 0);
  }

  // kWh
  get annualPrimaryEnergy(): number {
    const correctValue = sum(
      Object.values(this.fuels).map((fuel) => fuel.annualPrimaryEnergy),
    );
    if (
      this.dependencies.modelBehaviourFlags.currentEnergy.countSavingsCorrectlyInUsage
    ) {
      return correctValue;
    } else if (this.input.generation === null) {
      return correctValue;
    } else {
      // Miscount savings for compatibility with legacy
      const error =
        (this.input.generation.fractionUsedOnsite - 1) *
        this.dependencies.fuels.generation.primaryEnergyFactor *
        this.input.generation.annualEnergy;
      return correctValue + error;
    }
  }

  // kWh
  get annualEnergyFromFuels(): number {
    return sum(Object.values(this.input.annualEnergyByFuel));
  }

  /** "End use" means energy used in the home, including generation */
  // kWh
  get annualEnergyEndUse(): number {
    return this.annualEnergyFromFuels + (this.generation?.annualEnergyOnSite ?? 0);
  }

  mutateLegacyData(scenario: z.input<typeof scenarioSchema>): void {
    if (scenario === undefined) return;
    scenario.currentenergy = {
      ...scenario.currentenergy,
      generation: {
        ...scenario.currentenergy?.generation,
        primaryenergy: this.generation?.annualPrimaryEnergySaved ?? 0,
        annual_CO2: this.generation?.annualCarbonEmissionsSaved ?? 0,
        annual_savings: this.generation?.annualCostSaved ?? 0,
      },
      use_by_fuel: mapValues(this.fuels, (fuel) => ({
        annual_use: fuel.annualUse,
        annual_co2: fuel.annualCarbonEmissions,
        primaryenergy: fuel.annualPrimaryEnergy,
        annualcost: fuel.annualCost,
      })),
      primaryenergy_annual_kwh: this.annualPrimaryEnergy,
      total_co2: this.annualCarbonEmissions,
      total_cost: this.annualGrossCost,
      annual_net_cost: this.annualNetCost,
      enduse_annual_kwh: this.annualEnergyEndUse,
    };
  }
}

export class CurrentEnergyFuel {
  constructor(
    public annualUse: number,
    public fuel: CurrentEnergyDependencyFuel,
  ) {}

  // kg CO_2
  get annualCarbonEmissions(): number {
    return this.annualUse * this.fuel.carbonEmissionsFactor;
  }

  // kWh
  get annualPrimaryEnergy(): number {
    return this.annualUse * this.fuel.primaryEnergyFactor;
  }

  // £
  get annualCost(): number {
    if (this.annualUse <= 0) return 0;
    const useCharge = (this.annualUse * this.fuel.unitPrice) / 100;
    return useCharge + this.fuel.standingCharge;
  }
}

type GenerationInput = {
  annualEnergy: number; // kWh
  fractionUsedOnsite: number;
  annualFeedInTariffIncome: number; // £
};

class CurrentEnergyGeneration {
  constructor(
    public input: GenerationInput,
    private dependencies: CurrentEnergyDependencies,
  ) {}

  get fuel(): CurrentEnergyDependencyFuel {
    return this.dependencies.fuels.generation;
  }

  get annualEnergyOnSite(): number {
    return this.input.annualEnergy * this.input.fractionUsedOnsite;
  }

  get annualPrimaryEnergySaved(): number {
    if (
      this.dependencies.modelBehaviourFlags.currentEnergy
        .calculateSavingsIncorporatingOnsiteUse
    ) {
      return this.annualEnergyOnSite * this.fuel.primaryEnergyFactor;
    } else {
      return this.input.annualEnergy * this.fuel.primaryEnergyFactor;
    }
  }

  get annualCarbonEmissionsSaved(): number {
    if (
      this.dependencies.modelBehaviourFlags.currentEnergy
        .calculateSavingsIncorporatingOnsiteUse
    ) {
      return this.annualEnergyOnSite * this.fuel.carbonEmissionsFactor;
    } else {
      return this.input.annualEnergy * this.fuel.carbonEmissionsFactor;
    }
  }

  get annualCostSaved(): number {
    return (this.annualEnergyOnSite * this.fuel.unitPrice) / 100;
  }
}
