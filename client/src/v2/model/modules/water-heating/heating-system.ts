import { Scenario } from '../../../data-schemas/scenario';
import { solarHotWaterPrimaryCircutLossFactor } from '../../datasets';
import { Month } from '../../enums/month';
import { ModelError } from '../../error';

export type WaterHeatingSystemInput = WaterHeatingSystemCommon &
    (
        | InstantaneousInput
        | CombiInput
        | NonCombiWithPrimaryCircuitInput
        | NonCombiNoPrimaryCircuitInput
    );

type WaterHeatingSystemCommon = {
    fractionWaterHeating: number;
};

type InstantaneousInput = { type: 'instantaneous' };
type CombiInput =
    | {
          type: 'combi instantaneous';
          keepHotFacility: null | {
              controlledByTimeClock: boolean;
          };
      }
    | {
          type: 'combi storage';
          capacity: '>= 55 litres' | number;
      };
type NonCombiWithPrimaryCircuitInput = {
    type: 'non-combi with primary circuit';
    primaryCircuitLoss: {
        pipeworkInsulation:
            | null
            | 'uninsulated'
            | 'first metre'
            | 'all accessible'
            | 'fully insulated';
        hotWaterControl:
            | { type: 'no control' }
            | { type: 'cylinder thermostat'; separatelyTimedWaterHeating: boolean };
    };
};
type NonCombiNoPrimaryCircuitInput = {
    type: 'non-combi with no primary circuit';
};

type LegacySystem = Exclude<Scenario['heating_systems'], undefined>[0];
export function extractHeatingSystemHelper(
    legacySystem: LegacySystem,
    legacyScenario: Scenario,
): WaterHeatingSystemInput | null {
    if (legacySystem.provides === 'heating') {
        return null;
    }
    if (legacySystem.fraction_water_heating === 0) {
        return null;
    }
    const common: WaterHeatingSystemCommon = {
        fractionWaterHeating: legacySystem.fraction_water_heating,
    };
    let specific:
        | InstantaneousInput
        | CombiInput
        | NonCombiWithPrimaryCircuitInput
        | NonCombiNoPrimaryCircuitInput;
    if (legacySystem.instantaneous_water_heating) {
        specific = { type: 'instantaneous' };
    } else
        switch (legacySystem.combi_loss) {
            case '0':
            case 0: {
                specific = extractNonCombiSystem(legacySystem, legacyScenario);
                break;
            }
            case 'Instantaneous, without keep hot-facility':
                specific = {
                    type: 'combi instantaneous',
                    keepHotFacility: null,
                };
                break;
            case 'Instantaneous, with keep-hot facility controlled by time clock':
                specific = {
                    type: 'combi instantaneous',
                    keepHotFacility: { controlledByTimeClock: true },
                };
                break;
            case 'Instantaneous, with keep-hot facility not controlled by time clock':
                specific = {
                    type: 'combi instantaneous',
                    keepHotFacility: { controlledByTimeClock: false },
                };
                break;
            case 'Storage combi boiler < 55 litres':
            case 'Storage combi boiler  55 litres':
                if (legacySystem.combi_loss === 'Storage combi boiler  55 litres') {
                    // 'Storage combi boiler  55 litres' is a value produced by the
                    // old PHP backend applying HTML santisation to the original
                    // string 'Storage combi boiler < 56 litres'. It occurs in some
                    // very old assessments.
                    console.warn(
                        "Encountered 'Storage combi boiler  55 litres' when extracting combi boiler loss input",
                    );
                }
                console.warn(
                    'Extracting combi boiler capacity from legacy Vc value, but this is likely to be wrong as there is no way to set this input in the UI',
                );
                specific = {
                    type: 'combi storage',
                    capacity: legacyScenario.water_heating?.Vc ?? 0,
                };
                break;
            case 'Storage combi boiler >= 55 litres':
                specific = {
                    type: 'combi storage',
                    capacity: '>= 55 litres',
                };
                break;
        }
    return {
        ...common,
        ...specific,
    };
}

function extractNonCombiSystem(
    legacySystem: LegacySystem,
    legacyScenario: Scenario,
): NonCombiNoPrimaryCircuitInput | NonCombiWithPrimaryCircuitInput {
    if (legacySystem.combi_loss !== 0 && legacySystem.combi_loss !== '0') {
        throw new ModelError('called extractNonCombiSystem on a combi system');
    }
    switch (legacySystem.primary_circuit_loss) {
        case 'No':
            return { type: 'non-combi with no primary circuit' };
        case 'Yes': {
            let pipeworkInsulation: NonCombiWithPrimaryCircuitInput['primaryCircuitLoss']['pipeworkInsulation'];
            switch (legacyScenario.water_heating?.pipework_insulation) {
                case 'Uninsulated primary pipework':
                    pipeworkInsulation = 'uninsulated';
                    break;
                case 'First 1m from cylinder insulated':
                    pipeworkInsulation = 'first metre';
                    break;
                case 'All accesible piperwok insulated':
                    pipeworkInsulation = 'all accessible';
                    break;
                case 'Fully insulated primary pipework':
                    pipeworkInsulation = 'fully insulated';
                    break;
                case undefined:
                    throw new ModelError(
                        'Heating system was eligible for primary circuit loss but no pipework insulation provided',
                    );
            }
            let hotWaterControl: NonCombiWithPrimaryCircuitInput['primaryCircuitLoss']['hotWaterControl'];
            switch (legacyScenario.water_heating?.hot_water_control_type) {
                case 'no_cylinder_thermostat':
                    hotWaterControl = { type: 'no control' };
                    break;
                case 'Cylinder thermostat, water heating not separately timed':
                    hotWaterControl = {
                        type: 'cylinder thermostat',
                        separatelyTimedWaterHeating: false,
                    };
                    break;
                case 'Cylinder thermostat, water heating separately timed':
                    hotWaterControl = {
                        type: 'cylinder thermostat',
                        separatelyTimedWaterHeating: true,
                    };
                    break;
                case undefined:
                    throw new ModelError(
                        'Heating system eligible for primary circuit loss but no hot water controls specified',
                    );
            }
            return {
                type: 'non-combi with primary circuit',
                primaryCircuitLoss: {
                    pipeworkInsulation,
                    hotWaterControl,
                },
            };
        }
    }
}

export type WaterHeatingSystemDependencies = {
    waterCommon: {
        hotWaterEnergyContentByMonth: (m: Month) => number;
        dailyHotWaterUsageByMonth: (m: Month) => number;
        annualEnergyContentOverride: false | number;
        solarHotWater: boolean;
    };
};

type Monthly<T = number> = (month: Month) => T;
export type IWaterHeatingSystem = {
    distributionLossMonthly: Monthly;
    combiLossMonthly: Monthly;
    primaryCircuitLossMonthly: Monthly;
    usefulOutputMonthly: Monthly;
};

function commonDistributionLossMonthly(
    input: { fractionWaterHeating: number },
    dependencies: { waterCommon: { hotWaterEnergyContentByMonth: Monthly } },
    month: Month,
): number {
    return (
        0.15 *
        input.fractionWaterHeating *
        dependencies.waterCommon.hotWaterEnergyContentByMonth(month)
    );
}

function commonUsefulOutputMonthly(
    input: { fractionWaterHeating: number },
    dependencies: { waterCommon: { hotWaterEnergyContentByMonth: Monthly } },
    month: Month,
) {
    return (
        0.85 *
        input.fractionWaterHeating *
        dependencies.waterCommon.hotWaterEnergyContentByMonth(month)
    );
}

class Instantaneous implements IWaterHeatingSystem {
    constructor(
        private input: WaterHeatingSystemCommon & InstantaneousInput,
        private dependencies: WaterHeatingSystemDependencies,
    ) {}

    distributionLossMonthly() {
        return 0;
    }
    combiLossMonthly() {
        return 0;
    }
    primaryCircuitLossMonthly() {
        return 0;
    }
    usefulOutputMonthly(month: Month) {
        return commonUsefulOutputMonthly(this.input, this.dependencies, month);
    }
}

class Combi implements IWaterHeatingSystem {
    constructor(
        private input: WaterHeatingSystemCommon & CombiInput,
        private dependencies: WaterHeatingSystemDependencies,
    ) {}

    distributionLossMonthly(month: Month) {
        return commonDistributionLossMonthly(this.input, this.dependencies, month);
    }

    combiLossMonthly(month: Month) {
        const usage = this.dependencies.waterCommon.dailyHotWaterUsageByMonth(month);
        let usageFactor: number;
        if (this.dependencies.waterCommon.annualEnergyContentOverride !== false) {
            console.warn(
                'Reproducing buggy behaviour in water heating model; using usageFactor = 1',
            );
            usageFactor = 1;
        } else {
            usageFactor = Math.min(usage / 100.0, 1.0);
        }
        switch (this.input.type) {
            case 'combi instantaneous': {
                if (this.input.keepHotFacility === null) {
                    return (600 * usageFactor * month.days) / 365;
                }
                if (this.input.keepHotFacility.controlledByTimeClock) {
                    return (600 * month.days) / 365;
                } else {
                    return (900 * month.days) / 365;
                }
            }
            case 'combi storage': {
                if (this.input.capacity === '>= 55 litres') {
                    return 0;
                } else {
                    return (
                        ((600 - (this.input.capacity - 15) * 15) *
                            usageFactor *
                            month.days) /
                        365
                    );
                }
            }
        }
    }
    primaryCircuitLossMonthly() {
        return 0;
    }
    usefulOutputMonthly(month: Month) {
        return commonUsefulOutputMonthly(this.input, this.dependencies, month);
    }
}

class NonCombiNoPrimaryCircuit implements IWaterHeatingSystem {
    constructor(
        private input: WaterHeatingSystemCommon & NonCombiNoPrimaryCircuitInput,
        private dependencies: WaterHeatingSystemDependencies,
    ) {}

    distributionLossMonthly(month: Month) {
        return commonDistributionLossMonthly(this.input, this.dependencies, month);
    }
    combiLossMonthly() {
        return 0;
    }
    primaryCircuitLossMonthly() {
        return 0;
    }
    usefulOutputMonthly(month: Month) {
        return commonUsefulOutputMonthly(this.input, this.dependencies, month);
    }
}

class NonCombiWithPrimaryCircuit implements IWaterHeatingSystem {
    constructor(
        private input: WaterHeatingSystemCommon & NonCombiWithPrimaryCircuitInput,
        private dependencies: WaterHeatingSystemDependencies,
    ) {}

    distributionLossMonthly(month: Month) {
        return commonDistributionLossMonthly(this.input, this.dependencies, month);
    }
    combiLossMonthly() {
        return 0;
    }
    private heatingHoursPerDay(month: Month): number {
        switch (month.season) {
            case 'summer':
                return 3;
            case 'winter':
                if (this.input.primaryCircuitLoss.hotWaterControl.type === 'no control') {
                    return 11;
                } else if (
                    !this.input.primaryCircuitLoss.hotWaterControl
                        .separatelyTimedWaterHeating
                ) {
                    return 5;
                } else {
                    return 3;
                }
        }
    }

    get pipeworkInsulatedFraction(): number {
        switch (this.input.primaryCircuitLoss.pipeworkInsulation) {
            case 'uninsulated':
                return 0;
            case 'first metre':
                return 0.1;
            case 'all accessible':
                return 0.3;
            case 'fully insulated':
            case null:
                return 1.0;
        }
    }
    primaryCircuitLossMonthly(month: Month) {
        // SAP 2012, table 3, page 199
        const basicLoss =
            month.days *
            14 *
            ((0.0091 * this.pipeworkInsulatedFraction +
                0.0245 * (1 - this.pipeworkInsulatedFraction)) *
                this.heatingHoursPerDay(month) +
                0.0263);
        let solarHotWaterFactor: number;
        if (this.dependencies.waterCommon.solarHotWater) {
            solarHotWaterFactor = solarHotWaterPrimaryCircutLossFactor(month);
        } else {
            solarHotWaterFactor = 1;
        }
        return solarHotWaterFactor * basicLoss;
    }
    usefulOutputMonthly(month: Month) {
        return commonUsefulOutputMonthly(this.input, this.dependencies, month);
    }
}

export function constructWaterHeatingSystem(
    input: WaterHeatingSystemInput,
    dependencies: WaterHeatingSystemDependencies,
): IWaterHeatingSystem {
    switch (input.type) {
        case 'instantaneous':
            return new Instantaneous(input, dependencies);
        case 'combi instantaneous':
        case 'combi storage':
            return new Combi(input, dependencies);
        case 'non-combi with no primary circuit':
            return new NonCombiNoPrimaryCircuit(input, dependencies);
        case 'non-combi with primary circuit':
            return new NonCombiWithPrimaryCircuit(input, dependencies);
    }
}

export function isNonCombiWithPrimaryCircuit(
    system: IWaterHeatingSystem,
): system is NonCombiWithPrimaryCircuit {
    return system instanceof NonCombiWithPrimaryCircuit;
}
