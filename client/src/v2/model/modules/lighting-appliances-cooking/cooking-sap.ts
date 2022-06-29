import { Scenario } from '../../../data-schemas/scenario';
import { cache } from '../../../helpers/cache-decorators';
import { isTruthy } from '../../../helpers/is-truthy';
import { sum } from '../../../helpers/sum';
import { Month } from '../../enums/month';
import { Fuels } from '../fuels';
import { Fuel as FuelsModuleFuel } from '../fuels';
import { Fuel as LACModuleFuel, FuelInput } from './fuel';

export type CookingSAPInput = {
    energyEfficient: boolean;
    fuels: FuelInput[];
};

export function extractCookingSAPInputFromLegacy(scenario: Scenario): CookingSAPInput {
    const { LAC } = scenario;
    return {
        energyEfficient: LAC?.energy_efficient_cooking ?? false,
        fuels: LAC?.fuels_cooking?.map(({ fuel, fraction }) => ({
            name: fuel,
            fraction,
        })) ?? [{ name: Fuels.STANDARD_TARIFF, fraction: 1.0 }],
    };
}

export type CookingSAPDependencies = {
    floors: {
        totalFloorArea: number;
    };
    occupancy: {
        occupancy: number;
    };
    fuels: {
        names: string[];
        standardTariff: FuelsModuleFuel;
    };
};

export class CookingSAP {
    private input: Omit<CookingSAPInput, 'fuels'>;
    private fuels: LACModuleFuel[];

    constructor(input: CookingSAPInput, private dependencies: CookingSAPDependencies) {
        const { fuels, ...restInput } = input;
        this.input = restInput;
        this.fuels = fuels.map((f) => new LACModuleFuel(f, dependencies));
    }

    get heatGainPower(): number {
        if (this.input.energyEfficient) {
            return 23 + 5 * this.dependencies.occupancy.occupancy;
        } else {
            return 35 + 7 * this.dependencies.occupancy.occupancy;
        }
    }

    // kgCO_2/m_2/year
    get emissionsAnnual(): number {
        return (
            (119 + 24 * this.dependencies.occupancy.occupancy) /
            this.dependencies.floors.totalFloorArea
        );
    }

    get energyAnnual(): number {
        // Estimated from emissions
        return (
            (this.emissionsAnnual * this.dependencies.floors.totalFloorArea) /
            this.dependencies.fuels.standardTariff.emissions
        );
    }

    get energyMonthly(): number {
        return this.energyAnnual / Month.all.length;
    }

    @cache
    get fuelDemand(): Array<{ fuel: LACModuleFuel; demand: number }> {
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
        const { LAC } = data;
        LAC.energy_efficient_cooking = this.input.energyEfficient;
        LAC.EC = this.energyAnnual;
        LAC.EC_monthly = this.energyMonthly;

        // This is totally wrong -- GC should be the gain (in Watts) from
        // cooking, but it is actually being set to the annual energy demand
        // (in kWh/year) for cooking. Fortunately, nothing seems to use it.
        LAC.GC = this.energyAnnual;

        if (!isTruthy(data.LAC.fuels_cooking)) {
            data.LAC.fuels_cooking = [{ fuel: Fuels.STANDARD_TARIFF, fraction: 1 }];
        }

        if (this.heatGainPower > 0) {
            data.gains_W['Cooking'] = new Array(Month.all.length).fill(
                this.heatGainPower,
            );
            data.energy_requirements.cooking = {
                name: 'Cooking',
                quantity: this.energyAnnual,
                monthly: this.energyMonthly,
            };
            const fuelsLegacyArray = this.fuelDemand.map(({ fuel, demand }) => ({
                fuel: fuel.name,
                fraction: fuel.fraction,
                system_efficiency: 1,
                demand,
                fuel_input: demand,
            }));
            LAC.fuels_cooking = fuelsLegacyArray;
            data.fuel_requirements.cooking.list = fuelsLegacyArray;
            data.fuel_requirements.cooking.quantity = this.totalFuelDemand;
        }
    }
    /* eslint-enable */
}
