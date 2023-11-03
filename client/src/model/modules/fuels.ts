import { mapValues, pick } from 'lodash';
import { Scenario } from '../../data-schemas/scenario';
import { coalesceEmptyString } from '../../data-schemas/scenario/value-schemas';
import { defaultFuels } from '../datasets';
import { ModelError } from '../error';

export type Fuel = {
  category: 'gas' | 'solid fuel' | 'generation' | 'oil' | 'electricity';
  standingCharge: number; // £ per year
  unitPrice: number; // p per kWh
  carbonEmissionsFactor: number; // kg CO_2 per kWh
  primaryEnergyFactor: number;
};

export type FuelsDict = Record<string, Fuel>;

export function extractFuelsInputFromLegacy(scenario: Scenario): { fuels: FuelsDict } {
  const legacyFuels = Object.assign({}, defaultFuels, scenario?.fuels);
  type LegacyFuelData = (typeof legacyFuels)[''];
  type FuelData = FuelsDict[''];
  function sanitiseCategory(
    legacyCategory: LegacyFuelData['category'],
  ): FuelData['category'] {
    switch (legacyCategory) {
      case 'Gas':
        return 'gas';
      case 'Solid fuel':
        return 'solid fuel';
      case 'generation':
      case 'Generation':
        return 'generation';
      case 'Oil':
        return 'oil';
      case 'Electricity':
        return 'electricity';
    }
  }
  const newFuels = mapValues(
    legacyFuels,
    ({ category, standingcharge, fuelcost, co2factor, primaryenergyfactor }) => ({
      category: sanitiseCategory(category),
      standingCharge: coalesceEmptyString(standingcharge, 0),
      unitPrice: coalesceEmptyString(fuelcost, 0),
      carbonEmissionsFactor: coalesceEmptyString(co2factor, 0),
      primaryEnergyFactor: coalesceEmptyString(primaryenergyfactor, 0),
    }),
  );
  return { fuels: newFuels };
}

export class Fuels {
  public static STANDARD_TARIFF = 'Standard Tariff';
  public static GENERATION = 'generation';

  constructor(private input: { fuels: FuelsDict }) {
    const { fuels } = input;
    if (!(Fuels.STANDARD_TARIFF in fuels)) {
      throw new ModelError('fuels must contain standard tariff');
    }
    if (!(Fuels.GENERATION in fuels)) {
      throw new ModelError('fuels must contain generation');
    }
    if (
      this.generation.unitPrice !== this.standardTariff.unitPrice ||
      this.generation.primaryEnergyFactor !== this.standardTariff.primaryEnergyFactor ||
      this.generation.carbonEmissionsFactor !== this.standardTariff.carbonEmissionsFactor
    ) {
      /* The figures for unit price, primary energy factor and carbon
       * emission factor for generation actually represent what would be
       * the case if generation was not used and the energy was instead
       * imported from the standard tariff, so these figures must line
       * up. */
      console.warn(
        'Generation fuel parameters should equal standard tariff parameters, but they did not',
        pick(this, ['generation', 'standardTariff']),
      );
    }
  }

  get names(): string[] {
    return Object.keys(this.input.fuels);
  }

  get fuels(): FuelsDict {
    return this.input.fuels;
  }

  get standardTariff(): Fuel {
    // SAFETY: Presence of this key is checked by constructor
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.input.fuels[Fuels.STANDARD_TARIFF]!;
  }

  get generation(): Fuel {
    // SAFETY: Presence of this key is checked by constructor
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.input.fuels[Fuels.GENERATION]!;
  }
}
