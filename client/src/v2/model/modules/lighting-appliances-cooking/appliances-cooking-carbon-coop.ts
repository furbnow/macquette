import _ from 'lodash';

import { Scenario } from '../../../data-schemas/scenario';
import { coalesceEmptyString } from '../../../data-schemas/scenario/value-schemas';
import { sum } from '../../../helpers/array-reducers';
import { cache } from '../../../helpers/cache-decorators';
import { Month } from '../../enums/month';
import { ModelError } from '../../error';
import { ModelBehaviourFlags } from '../behaviour-version';

export type AppliancesCookingCarbonCoopInput = Array<LoadInput>;
type FuelType = 'electricity' | 'gas' | 'oil';

// Since cookers and other appliances are counted separately, but share the
// same individual model, we refer to them generically as a "load"
type LoadInput = {
    originalIndex: number;
    numberUsed: number;
    aPlusRated: boolean;
    normalisedDemand: number;
    utilisationFactor: number;
    referenceQuantity: number;
    annualUseFrequency: number;
    fuel: { type: FuelType; name: string; efficiency: number };
    category: 'appliances' | 'cooking';
};

export function extractAppliancesCarbonCoopInputFromLegacy(
    scenario: Scenario,
): AppliancesCookingCarbonCoopInput {
    return (
        scenario.applianceCarbonCoop?.list?.map((item, index): LoadInput => {
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
                originalIndex: index,
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
    modelBehaviourFlags: ModelBehaviourFlags;
};

export class AppliancesCookingCarbonCoop {
    private cooking: LoadCollection;
    private appliances: LoadCollection;
    constructor(
        input: AppliancesCookingCarbonCoopInput,
        dependencies: AppliancesCookingCarbonCoopDependencies,
    ) {
        this.cooking = new LoadCollection(
            input.filter((i) => i.category === 'cooking'),
            dependencies,
        );
        this.appliances = new LoadCollection(
            input.filter((i) => i.category === 'appliances'),
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
                    this.appliances.energyDemandMonthly(m) +
                    this.cooking.energyDemandMonthly(m),
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
        gains_W['Appliances'] = Month.all.map((m) => this.appliances.heatGainMonthly(m));
        gains_W['Cooking'] = Month.all.map((m) => this.cooking.heatGainMonthly(m));

        applianceCarbonCoop.fuel_input_total['appliances'] =
            this.appliances.fuelInputAnnual;
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
        public input: Array<LoadInput>,
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

    get heatGainAnnual(): number {
        if (this.flags.convertGainsToWatts) {
            const kWhPerYearToWatts = 1000 / (24 * 365);
            return this.energyDemandAnnual * kWhPerYearToWatts;
        } else {
            console.warn(
                'Reproducing buggy behaviour in appliances & cooking gains calculation. This will introduce a significant error (5-40%) in the final space heating demand figure.',
            );
            return this.energyDemandAnnual;
        }
    }

    heatGainMonthly(month: Month): number {
        const monthWeight = month.days / 365;
        return this.heatGainAnnual * monthWeight;
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
                const fraction = energyDemand / this.fuelInputAnnual;
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
        public input: LoadInput,
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