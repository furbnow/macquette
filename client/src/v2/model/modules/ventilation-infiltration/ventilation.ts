import { coalesceEmptyString } from '../../../data-schemas/helpers/legacy-numeric-values';
import { Scenario } from '../../../data-schemas/scenario';
import { cache, cacheMonth } from '../../../helpers/cache-decorators';
import { mean } from '../../../helpers/mean';
import { sum } from '../../../helpers/sum';
import { Month } from '../../enums/month';
import { VentilationPoint } from './common-types';

type Unplanned = { type: 'unplanned/natural ventilation' };

type IntermittentExtract = {
    type: 'intermittent extract';
    extractVentilationPoints: VentilationPoint[];
};
type PositiveInputOrMechanicalExtract = {
    type: 'positive input or mechanical extract';
    systemAirChangeRate: number;
};
type PassiveStack = {
    type: 'passive stack';
    extractVentilationPoints: VentilationPoint[];
};
type MechanicalVentilationWithHeatRecovery = {
    type: 'mechanical ventilation with heat recovery';
    efficiencyProportion: number; // in range [0, 1]
    systemAirChangeRate: number;
};

// could be centralised or decentralised
type MechanicalVentilation = {
    type: 'mechanical ventilation';
    systemAirChangeRate: number;
};

export type VentilationInput =
    | Unplanned
    | IntermittentExtract
    | PositiveInputOrMechanicalExtract
    | PassiveStack
    | MechanicalVentilation
    | MechanicalVentilationWithHeatRecovery;

export type VentilationDependencies = {
    floors: { totalVolume: number };
    ventilationInfiltrationCommon: {
        shelterFactor: number;
        windFactor: (m: Month) => number;
    };
};

export const extractVentilationInputFromLegacy = (
    scenario: Scenario,
): VentilationInput => {
    const { ventilation } = scenario;
    const extractVentilationPoints =
        ventilation?.EVP?.map(({ ventilation_rate }) => ({
            ventilationRate: coalesceEmptyString(ventilation_rate, 0) ?? 0,
        })) ?? [];
    const systemAirChangeRate =
        coalesceEmptyString(ventilation?.system_air_change_rate, 0) ?? 0.5;
    switch (ventilation?.ventilation_type) {
        case undefined:
        case 'NV': {
            return { type: 'unplanned/natural ventilation' };
        }
        case 'IE': {
            return { type: 'intermittent extract', extractVentilationPoints };
        }
        case 'DEV':
        case 'MEV': {
            return {
                type: 'positive input or mechanical extract',
                systemAirChangeRate,
            };
        }
        case 'PS': {
            return {
                type: 'passive stack',
                extractVentilationPoints,
            };
        }
        case 'MVHR': {
            return {
                type: 'mechanical ventilation with heat recovery',
                systemAirChangeRate,
                efficiencyProportion:
                    (coalesceEmptyString(
                        ventilation?.balanced_heat_recovery_efficiency,
                        0,
                    ) ?? 65) / 100,
            };
        }
        case 'MV': {
            return {
                type: 'mechanical ventilation',
                systemAirChangeRate,
            };
        }
    }
};

export class Ventilation {
    constructor(
        private input: VentilationInput,
        private dependencies: VentilationDependencies,
    ) {}

    // in ACH
    @cache
    private get rawEVPAirChanges(): number {
        switch (this.input.type) {
            case 'intermittent extract':
            case 'passive stack': {
                const perPointRates = this.input.extractVentilationPoints.map(
                    (v) => v.ventilationRate,
                );
                if (this.dependencies.floors.totalVolume === 0) {
                    return 0;
                }
                return sum(perPointRates) / this.dependencies.floors.totalVolume;
            }
            case 'unplanned/natural ventilation':
            case 'mechanical ventilation':
            case 'mechanical ventilation with heat recovery':
            case 'positive input or mechanical extract': {
                return 0;
            }
        }
    }

    private adjustedEVPAirChanges(month: Month): number {
        return (
            this.dependencies.ventilationInfiltrationCommon.shelterFactor *
            this.dependencies.ventilationInfiltrationCommon.windFactor(month) *
            this.rawEVPAirChanges
        );
    }

    airChangesPerHour(month: Month): number {
        switch (this.input.type) {
            case 'unplanned/natural ventilation':
            case 'intermittent extract':
            case 'passive stack':
                /*
                    According to SAP 9, if the infiltration rate ≥ 1, then the
                    combined infiltration and ventilation rate should be set to
                    the calculated adjusted infiltration rate; otherwise it
                    should be 0.5 + [infiltration rate squared × 0.5]. (This is
                    expressed as "if (22b)m ≥ 1, then (24d)m = (22b)m,
                    otherwise (24d)m = 0.5 + [(22b)m² × 0.5]".)

                    However, this leads to an underestimation of heat losses
                    from infiltration in some cases, and in any case our model
                    divorces ventilation and infiltration, so we ignore the
                    special case and always use the "otherwise" formula.

                    See https://github.com/emoncms/MyHomeEnergyPlanner/issues/407.
                */
                return this.adjustedEVPAirChanges(month);
            case 'positive input or mechanical extract':
                /*
                    Similar to above, SAP 9 says if the infiltration rate is less than
                    0.5, then the combined infiltration and ventilation rate
                    should be set to the system air change rate of the
                    ventilation system; otherwise it should be the calculated
                    adjusted infiltration rate plus 0.5 × the system air change
                    rate. (This is expressed as "if (22b)m < 0.5, then
                    (24c) = (23b); otherwise (24c) = (22b)m + 0.5 × (23b)".)

                    Again, to avoid underestimating heat losses from
                    infiltration, we ignore the special case.

                    See https://github.com/emoncms/MyHomeEnergyPlanner/issues/407.
                */
                return 0.5 * this.input.systemAirChangeRate;
            case 'mechanical ventilation':
                return this.input.systemAirChangeRate;
            case 'mechanical ventilation with heat recovery':
                return (
                    this.input.systemAirChangeRate * (1 - this.input.efficiencyProportion)
                );
        }
    }

    @cacheMonth
    heatLossMonthly(month: Month): number {
        return (
            this.airChangesPerHour(month) * 0.33 * this.dependencies.floors.totalVolume
        );
    }

    @cache
    get heatLossAverage(): number {
        return mean(Month.all.map((m) => this.heatLossMonthly(m) ?? 0));
    }

    /* eslint-disable
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-argument,
       @typescript-eslint/no-unsafe-assignment,
       @typescript-eslint/no-unsafe-member-access,
       @typescript-eslint/consistent-type-assertions,
    */
    mutateLegacyData(data: any) {
        data.ventilation = data.ventilation ?? {};
        const { ventilation } = data;
        ventilation.EVP_air_changes = this.rawEVPAirChanges;
        ventilation.adjusted_EVP_air_changes = Month.all.map((m) =>
            this.adjustedEVPAirChanges(m),
        );
        ventilation.average_ventilation_WK = this.heatLossAverage;
        const ventilationHeatLossArray = Month.all.map((m) => this.heatLossMonthly(m));
        ventilation.ventilation_WK = ventilationHeatLossArray;
        data.losses_WK.ventilation = ventilationHeatLossArray;
    }
    /* eslint-enable */
}
