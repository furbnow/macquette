import { coalesceEmptyString } from '../../legacy-state-validators/numericValues';
import { LegacyScenario } from '../../legacy-state-validators/scenario';
import { ModelError } from '../error';

export type Fuel = {
    category: 'gas' | 'solid fuel' | 'generation' | 'oil' | 'electricity';
    standingCharge: number; // £ per year
    unitPrice: number; // p per kWh
    emissions: number; // kg CO_2 per kWh
    primaryEnergyFactor: number;
};

export type FuelsDict = Record<string, Fuel>;

export const extractFuelsInputFromLegacy = (scenario: LegacyScenario): FuelsDict => {
    const legacyFuels = scenario.fuels ?? {};
    type LegacyFuelData = typeof legacyFuels[''];
    type FuelData = FuelsDict[''];
    const legacyEntries = Object.entries(scenario.fuels ?? {});
    const sanitiseCategory = (
        legacyCategory: LegacyFuelData['category'],
    ): FuelData['category'] => {
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
    };
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
                emissions: coalesceEmptyString(co2factor, 0),
                primaryEnergyFactor: coalesceEmptyString(primaryenergyfactor, 0),
            },
        ],
    );
    return Object.fromEntries(newEntries);
};

export class Fuels {
    public static STANDARD_TARIFF = 'Standard Tariff';

    constructor(private input: FuelsDict) {
        if (!(Fuels.STANDARD_TARIFF in input)) {
            throw new ModelError('fuels must contain standard tariff');
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
}
