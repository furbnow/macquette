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

export function extractFuelsInputFromLegacy(scenario: Scenario): FuelsDict {
    const legacyFuels = Object.assign({}, defaultFuels, scenario?.fuels);
    type LegacyFuelData = typeof legacyFuels[''];
    type FuelData = FuelsDict[''];
    const legacyEntries = Object.entries(legacyFuels);
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
    const newEntries: Array<[string, FuelData]> = legacyEntries.map(
        ([
            name,
            { category, standingcharge, fuelcost, co2factor, primaryenergyfactor },
        ]) => [
            name,
            {
                category: sanitiseCategory(category),
                standingCharge: coalesceEmptyString(standingcharge, 0),
                unitPrice: coalesceEmptyString(fuelcost, 0),
                carbonEmissionsFactor: coalesceEmptyString(co2factor, 0),
                primaryEnergyFactor: coalesceEmptyString(primaryenergyfactor, 0),
            },
        ],
    );
    return Object.fromEntries(newEntries);
}

export class Fuels {
    public static STANDARD_TARIFF = 'Standard Tariff';
    public static GENERATION = 'generation';

    constructor(private input: FuelsDict) {
        if (!(Fuels.STANDARD_TARIFF in input)) {
            throw new ModelError('fuels must contain standard tariff');
        }
        if (!(Fuels.GENERATION in input)) {
            throw new ModelError('fuels must contain generation');
        }
    }

    get names(): string[] {
        return Object.keys(this.input);
    }

    get standardTariff(): Fuel {
        // SAFETY: Presence of this key is checked by constructor
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.input[Fuels.STANDARD_TARIFF]!;
    }

    get generation(): Fuel {
        // SAFETY: Presence of this key is checked by constructor
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.input[Fuels.GENERATION]!;
    }
}
