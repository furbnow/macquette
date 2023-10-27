import { Scenario } from '../../data-schemas/scenario';
import { coalesceEmptyString } from '../../data-schemas/scenario/value-schemas';
import { sum } from '../../helpers/array-reducers';
import { cache } from '../../helpers/cache-decorators';
import { Result } from '../../helpers/result';
import { Orientation } from '../enums/orientation';
import { Overshading } from '../enums/overshading';
import { Region } from '../enums/region';
import { calculateSolarRadiationAnnual } from '../solar-flux';
import { ModelBehaviourFlags } from './behaviour-version';

export type GenerationInput = {
  solar: GenericFuelSpec | SolarFuelCalculatorSpec;
  wind: GenericFuelSpec;
  hydro: GenericFuelSpec;
};

type GenericFuelSpec = {
  type: 'generic fuel';
  annualEnergy: number;
  fractionUsedOnsite: number;
  feedInTariff: {
    generationUnitPrice: number;
    exportUnitPrice: number;
  };
};
type SolarFuelCalculatorSpec = Omit<GenericFuelSpec, 'type' | 'annualEnergy'> & {
  type: 'solar calculator spec';
  annualEnergy:
    | 'incomplete input'
    | {
        capacity: number; // kWp (peak power under standard conditions)
        orientation: Orientation;
        inclination: number; // degrees
        overshading: Overshading;
      };
};

export type GenerationDependencies = {
  region: Region;
  fuels: {
    generation: {
      carbonEmissionsFactor: number;
      primaryEnergyFactor: number;
    };
  };
  modelBehaviourFlags: ModelBehaviourFlags;
};

export function extractGenerationInputFromLegacy(scenario: Scenario): GenerationInput {
  const { generation } = scenario ?? {};
  return {
    solar: extractSolarFuelSpec(generation),
    wind: extractWindFuelSpec(generation),
    hydro: extractHydroFuelSpec(generation),
  };
}

function stringyNumberToResult(val: number | ''): Result<number, ''> {
  if (typeof val === 'number') return Result.ok(val);
  else return Result.err(val);
}

function extractWindFuelSpec(
  generation: Exclude<Scenario, undefined>['generation'],
): GenericFuelSpec {
  return {
    type: 'generic fuel',
    annualEnergy: coalesceEmptyString(generation?.wind_annual_kwh, 0) ?? 0,
    fractionUsedOnsite:
      coalesceEmptyString(generation?.wind_fraction_used_onsite, 0) ?? 0,
    feedInTariff: {
      generationUnitPrice: coalesceEmptyString(generation?.wind_FIT, 0) ?? 0,
      exportUnitPrice: coalesceEmptyString(generation?.wind_export_FIT, 0) ?? 0,
    },
  };
}

function extractHydroFuelSpec(
  generation: Exclude<Scenario, undefined>['generation'],
): GenericFuelSpec {
  return {
    type: 'generic fuel',
    annualEnergy: coalesceEmptyString(generation?.hydro_annual_kwh, 0) ?? 0,
    fractionUsedOnsite:
      coalesceEmptyString(generation?.hydro_fraction_used_onsite, 0) ?? 0,
    feedInTariff: {
      generationUnitPrice: coalesceEmptyString(generation?.hydro_FIT, 0) ?? 0,
      exportUnitPrice: coalesceEmptyString(generation?.hydro_export_FIT, 0) ?? 0,
    },
  };
}

function extractSolarFuelSpec(
  generation: Exclude<Scenario, undefined>['generation'],
): GenericFuelSpec | SolarFuelCalculatorSpec {
  const mixin = {
    fractionUsedOnsite:
      coalesceEmptyString(generation?.solar_fraction_used_onsite, 0) ?? 0,
    feedInTariff: {
      generationUnitPrice: coalesceEmptyString(generation?.solar_FIT, 0) ?? 0,
      exportUnitPrice: coalesceEmptyString(generation?.solar_export_FIT, 0) ?? 0,
    },
  };
  if (generation?.use_PV_calculator === true) {
    const orientationR = stringyNumberToResult(generation?.solarpv_orientation)
      .map((n) => Orientation.optionalFromIndex0(n))
      .chain((o) => Result.fromNullable(o));
    const overshadingR = stringyNumberToResult(generation?.solarpv_overshading)
      .map((f) => guessOvershadingFromFactor(f))
      .chain((o) => Result.fromNullable(o));
    if (!orientationR.isOk()) {
      return {
        type: 'solar calculator spec',
        ...mixin,
        annualEnergy: 'incomplete input',
      };
    }
    if (!overshadingR.isOk()) {
      return {
        type: 'solar calculator spec',
        ...mixin,
        annualEnergy: 'incomplete input',
      };
    }
    const orientation = orientationR.coalesce();
    const overshading = overshadingR.coalesce();
    return {
      type: 'solar calculator spec',
      ...mixin,
      annualEnergy: {
        capacity: coalesceEmptyString(generation?.solarpv_kwp_installed, 0) ?? 0,
        orientation,
        inclination: coalesceEmptyString(generation?.solarpv_inclination, 0) ?? 0,
        overshading,
      },
    };
  } else {
    return {
      type: 'generic fuel',
      ...mixin,
      annualEnergy: coalesceEmptyString(generation?.solar_annual_kwh, 0) ?? 0,
    };
  }
}

function guessOvershadingFromFactor(factor: number): Overshading | null {
  switch (factor) {
    case 0.5:
      return new Overshading('>80%');
    case 0.65:
      return new Overshading('60-80%');
    case 0.8:
      return new Overshading('20-60%');
    case 1:
      return new Overshading('<20%');
    default:
      return null;
  }
}

class GenerationFuel {
  constructor(
    private input: GenericFuelSpec | SolarFuelCalculatorSpec,
    private dependencies: GenerationDependencies,
  ) {}

  @cache
  get energyAnnual(): number {
    if (this.input.type === 'generic fuel') return this.input.annualEnergy;
    const { annualEnergy } = this.input;
    if (annualEnergy === 'incomplete input') return 0;
    const { orientation, inclination, overshading, capacity } = annualEnergy;
    const radiation = calculateSolarRadiationAnnual(
      this.dependencies.region,
      orientation,
      inclination,
    );
    return 0.8 * capacity * radiation * overshadingFactor(overshading);
  }

  get energyUsedOnsiteAnnual(): number {
    return this.energyAnnual * this.input.fractionUsedOnsite;
  }

  get carbonEmissionsAnnual(): number {
    return this.energyAnnual * this.dependencies.fuels.generation.carbonEmissionsFactor;
  }

  get primaryEnergyAnnual(): number {
    return this.energyAnnual * this.dependencies.fuels.generation.primaryEnergyFactor;
  }

  get generationIncomeAnnual(): number {
    return this.energyAnnual * this.input.feedInTariff.generationUnitPrice;
  }

  get exportIncomeAnnual(): number {
    return 0.5 * this.energyAnnual * this.input.feedInTariff.exportUnitPrice;
  }

  get totalIncomeAnnual(): number {
    return this.generationIncomeAnnual + this.exportIncomeAnnual;
  }
}

export class Generation {
  constructor(
    private input: GenerationInput,
    private dependencies: GenerationDependencies,
  ) {}

  get solar(): GenerationFuel {
    return new GenerationFuel(this.input.solar, this.dependencies);
  }

  get wind(): GenerationFuel {
    return new GenerationFuel(this.input.wind, this.dependencies);
  }

  get hydro(): GenerationFuel {
    return new GenerationFuel(this.input.hydro, this.dependencies);
  }

  private sumOverFuels(fieldAccessor: (fuel: GenerationFuel) => number): number {
    return sum(
      [this.solar, this.wind, this.hydro].map((fuel) =>
        // Reproduce bug in legacy when given negative inputs
        fuel.energyAnnual <= 0 ? 0 : fieldAccessor(fuel),
      ),
    );
  }

  get incomeAnnual(): number {
    return this.sumOverFuels((fuel) => fuel.totalIncomeAnnual);
  }

  get energyAnnual(): number {
    return this.sumOverFuels((fuel) => fuel.energyAnnual);
  }

  get energyUsedOnsiteAnnual(): number {
    return this.sumOverFuels((fuel) => fuel.energyUsedOnsiteAnnual);
  }

  get energyExportedAnnual(): number {
    return this.energyAnnual - this.energyUsedOnsiteAnnual;
  }

  get carbonEmissionsAnnual(): number {
    return this.sumOverFuels((fuel) => fuel.carbonEmissionsAnnual);
  }

  get primaryEnergyAnnual(): number {
    if (
      this.dependencies.modelBehaviourFlags.generation
        .includeAllSystemsInPrimaryEnergyTotal
    ) {
      return this.sumOverFuels((fuel) => fuel.primaryEnergyAnnual);
    } else {
      // Replicate legacy bug: legacy model iterates through solar, wind,
      // hydro (in that order) and the last one with non-zero energy gets
      // to set the total primary energy.
      return (
        [this.hydro, this.wind, this.solar].find((fuel) => fuel.energyAnnual > 0)
          ?.primaryEnergyAnnual ?? 0
      );
    }
  }

  /* eslint-disable
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-argument,
       @typescript-eslint/no-unsafe-assignment,
       @typescript-eslint/no-unsafe-member-access,
       @typescript-eslint/consistent-type-assertions,
    */
  mutateLegacyData(data: any) {
    const { generation } = data;
    generation.solar_annual_kwh = this.solar.energyAnnual;
    if (this.solar.energyAnnual > 0) {
      generation.systems.solarpv = {
        name: 'Solar PV',
        quantity: this.solar.energyAnnual,
        fraction_used_onsite: this.input.solar.fractionUsedOnsite,
        CO2: this.solar.carbonEmissionsAnnual,
        primaryenergy: this.solar.primaryEnergyAnnual,
      };
    }
    if (this.wind.energyAnnual > 0) {
      generation.systems.wind = {
        name: 'Wind',
        quantity: this.wind.energyAnnual,
        fraction_used_onsite: this.input.wind.fractionUsedOnsite,
        CO2: this.wind.carbonEmissionsAnnual,
        primaryenergy: this.wind.primaryEnergyAnnual,
      };
    }
    if (this.hydro.energyAnnual > 0) {
      generation.systems.hydro = {
        name: 'Hydro',
        quantity: this.hydro.energyAnnual,
        fraction_used_onsite: this.input.hydro.fractionUsedOnsite,
        CO2: this.hydro.carbonEmissionsAnnual,
        primaryenergy: this.hydro.primaryEnergyAnnual,
      };
    }
    data.total_income = this.incomeAnnual;
    generation.total_generation = this.energyAnnual;
    generation.total_used_onsite = this.energyUsedOnsiteAnnual;
    generation.total_CO2 = this.carbonEmissionsAnnual;
    generation.total_primaryenergy = this.primaryEnergyAnnual;
    generation.total_exported = this.energyExportedAnnual;
  }
  /* eslint-enable */
}

function overshadingFactor(overshading: Overshading): number {
  switch (overshading.name) {
    case '<20%':
      return 1;
    case '20-60%':
      return 0.8;
    case '60-80%':
      return 0.65;
    case '>80%':
      return 0.5;
  }
}
