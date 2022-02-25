import { cache, cacheMonth } from '../../../helpers/cache-decorators';
import { sum } from '../../../helpers/sum';
import { LegacyScenario } from '../../../legacy-state-validators/scenario';
import { Month } from '../../enums/month';
import { Fuels } from '../fuels';
import { Fuel, FuelInput } from './fuel';

export type LightingSAPInput = {
    outlets: {
        total: number;
        lowEnergy: number;
    };
    reducedHeatGains: boolean;
    fuels: FuelInput[];
};

export const extractLightingSAPInputFromLegacy = (
    scenario: LegacyScenario,
): LightingSAPInput => {
    const { LAC } = scenario;
    // undefined => 1; empty string => 0... obviously
    const interpretLightOutletLegacyValue = (val: number | '' | undefined) =>
        val === '' ? 0 : val === undefined ? 1 : val;
    return {
        outlets: {
            total: interpretLightOutletLegacyValue(LAC?.L),
            lowEnergy: interpretLightOutletLegacyValue(LAC?.LLE),
        },
        reducedHeatGains: LAC?.reduced_heat_gains_lighting ?? false,
        fuels: LAC?.fuels_lighting?.map(({ fuel, fraction }) => ({
            name: fuel,
            fraction,
        })) ?? [{ name: Fuels.STANDARD_TARIFF, fraction: 1.0 }],
    };
};

export type LightingSAPDependencies = {
    fuels: { names: string[] };
    floors: { totalFloorArea: number };
    occupancy: { occupancy: number };
    fabric: { naturalLight: number };
};

export class LightingSAP {
    private input: Omit<LightingSAPInput, 'fuels'>;
    private fuels: Fuel[];

    constructor(input: LightingSAPInput, private dependencies: LightingSAPDependencies) {
        const { fuels, ...restInput } = input;
        this.input = restInput;
        this.fuels = fuels.map((f) => new Fuel(f, dependencies));
    }

    // aka E_B
    get baselineEnergyAnnual() {
        return (
            59.73 *
            Math.pow(
                this.dependencies.floors.totalFloorArea *
                    this.dependencies.occupancy.occupancy,
                0.4714,
            )
        );
    }

    // aka C_1
    get lowEnergyCorrectionFactor(): number | null {
        const { lowEnergy, total } = this.input.outlets;
        if (total === 0) {
            return null;
        } else {
            return 1 - 0.5 * (lowEnergy / total);
        }
    }

    // aka C_2
    get daylightingCorrectionFactor(): number {
        const { naturalLight } = this.dependencies.fabric;
        if (naturalLight <= 0.095) {
            return 52.2 * naturalLight * naturalLight - 9.94 * naturalLight + 1.433;
        } else {
            return 0.96;
        }
    }

    // aka E_L (initial value)
    get initialEnergyAnnual(): number {
        return (
            this.baselineEnergyAnnual *
            (this.lowEnergyCorrectionFactor ?? 0) *
            this.daylightingCorrectionFactor
        );
    }

    @cacheMonth
    // aka E_L,m
    energyMonthly(month: Month): number {
        const adjustment = 1 + 0.5 * Math.cos((2 * Math.PI * (month.index1 - 0.2)) / 12);
        const weight = month.days / 365;
        return this.initialEnergyAnnual * adjustment * weight;
    }

    // aka E_L (final value)
    get energyAnnual(): number {
        return sum(Month.all.map((m) => this.energyMonthly(m)));
    }

    // aka G_{L,m}
    heatGainMonthly(month: Month): number {
        const reducedGainFactor = this.input.reducedHeatGains ? 0.4 : 1.0;
        return (
            (reducedGainFactor * this.energyMonthly(month) * 0.85 * 1000) /
            (24 * month.days)
        );
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
        const { LAC } = data;
        LAC.LLE = this.input.outlets.lowEnergy;
        LAC.L = this.input.outlets.total;
        LAC.reduced_heat_gains_lighting = this.input.reducedHeatGains;
        LAC.EB = this.baselineEnergyAnnual;

        // This if-statement is ugly because it reads from the legacy data
        // object. Fortunately, it does not seem essential for any actual
        // subsequent behaviour, so all the real functionality is still
        // captured in the other methods of this class.
        if (LAC.fuels_lighting == undefined) {
            LAC.fuels_lighting = [{ fuel: Fuels.STANDARD_TARIFF, fraction: 1 }];
        }
        if (this.input.outlets.total !== 0) {
            LAC.C1 = this.lowEnergyCorrectionFactor;
            LAC.C2 = this.daylightingCorrectionFactor;
            LAC.EL = this.initialEnergyAnnual;
            data.energy_requirements = data.energy_requirements ?? {};
            if (this.energyAnnual > 0) {
                data.energy_requirements.lighting = {
                    name: 'Lighting',
                    quantity: this.energyAnnual,
                    monthly: Month.all.map((m) => this.energyMonthly(m)),
                };
                data.gains_W['Lighting'] = Month.all.map((m) => this.heatGainMonthly(m));
                const legacyFuelsLighting = this.fuelDemand.map(({ fuel, demand }) => ({
                    fuel: fuel.name,
                    fraction: fuel.fraction,
                    system_efficiency: 1,
                    demand,
                    fuel_input: demand,
                }));
                LAC.fuels_lighting = legacyFuelsLighting;
                data.fuel_requirements.lighting.list = legacyFuelsLighting;
                data.fuel_requirements.lighting.quantity = this.totalFuelDemand;
            }
        }
    }
    /* eslint-enable */
}
