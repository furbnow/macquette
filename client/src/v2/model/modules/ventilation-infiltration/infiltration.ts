import { Scenario } from '../../../data-schemas/scenario';
import { coalesceEmptyString } from '../../../data-schemas/scenario/value-schemas';
import { sum } from '../../../helpers/array-reducers';
import { mean } from '../../../helpers/array-reducers';
import { cache, cacheMonth } from '../../../helpers/cache-decorators';
import { Month } from '../../enums/month';
import { VentilationPoint } from './common-types';

export type InfiltrationInput = {
    estimateFrom:
        | {
              type: 'fabric elements';
              numberOfFloorsOverride: number | null;
              walls: 'timber' | 'masonry';
              floor: 'suspended sealed' | 'suspended unsealed' | 'solid';
              draughtProofedProportion: number; // In range [0, 1]
              draughtLobby: boolean;
          }
        | {
              type: 'pressure test';
              airPermeability: number; // q_50
          };
    intentionalVentsFlues: VentilationPoint[];
};

export function extractInfiltrationInputFromLegacy(
    scenario: Scenario,
): InfiltrationInput {
    const { ventilation } = scenario;
    const intentionalVentsFlues =
        ventilation?.IVF?.map(({ ventilation_rate }) => ({
            ventilationRate: coalesceEmptyString(ventilation_rate, 0),
        })) ?? [];
    let estimateFrom: InfiltrationInput['estimateFrom'];
    if (ventilation?.air_permeability_test === true) {
        estimateFrom = {
            type: 'pressure test',
            airPermeability:
                coalesceEmptyString(ventilation?.air_permeability_value, 0) ?? 0,
        };
    } else {
        const { dwelling_construction, suspended_wooden_floor } = ventilation ?? {};
        function interpretWalls(legacyValue: typeof dwelling_construction) {
            switch (legacyValue) {
                case 'timberframe':
                case undefined:
                    return 'timber';
                case 'masonry':
                    return 'masonry';
            }
        }
        function interpretFloor(legacyValue: typeof suspended_wooden_floor) {
            switch (legacyValue) {
                case 0:
                case undefined:
                    return 'solid';
                case 'sealed':
                    return 'suspended sealed';
                case 'unsealed':
                    return 'suspended unsealed';
            }
        }
        estimateFrom = {
            type: 'fabric elements',
            numberOfFloorsOverride: scenario.num_of_floors_override ?? null,
            walls: interpretWalls(dwelling_construction),
            floor: interpretFloor(suspended_wooden_floor),
            draughtProofedProportion:
                coalesceEmptyString(ventilation?.percentage_draught_proofed ?? 0, 0) /
                100,
            draughtLobby: ventilation?.draught_lobby ?? false,
        };
    }
    return { intentionalVentsFlues, estimateFrom };
}

export type InfiltrationDependencies = {
    floors: { totalVolume: number; numberOfFloors: number };
    fabric: { envelopeArea: number };
    ventilationInfiltrationCommon: {
        shelterFactor: number;
        windFactor: (m: Month) => number;
    };
};

export class Infiltration {
    constructor(
        private input: InfiltrationInput,
        private dependencies: InfiltrationDependencies,
    ) {}

    private get structuralAirChangesPerHour(): number {
        switch (this.input.estimateFrom.type) {
            case 'pressure test': {
                /* SAP uses the formula:
                 *
                 * (q_50) / 20
                 *
                 * where q_50 is the air permeability value from test. q_50 has
                 * units of cubic metres of air per hour, per meter squared of
                 * envelope area (i.e. m^3/h/m^2). If we assume the 20 in the
                 * formula is a unitless ratio, this means we should apply a
                 * correction factor to convert the q_50 into air changes per
                 * hour. The correction factor is:
                 *
                 * (envelope area) / (total volume)
                 *
                 * This results in a figure in units of air changes per hour.
                 */
                const correctionFactor =
                    this.dependencies.fabric.envelopeArea /
                    this.dependencies.floors.totalVolume;
                const sapValue = this.input.estimateFrom.airPermeability / 20;
                return correctionFactor * sapValue;
            }
            case 'fabric elements': {
                const {
                    walls,
                    numberOfFloorsOverride,
                    floor,
                    draughtLobby,
                    draughtProofedProportion,
                } = this.input.estimateFrom;
                const numberOfFloors =
                    numberOfFloorsOverride ?? this.dependencies.floors.numberOfFloors;
                const additionalInfiltration = (numberOfFloors - 1) * 0.1;
                let wallsInfiltration: number;
                switch (walls) {
                    case 'timber': {
                        wallsInfiltration = 0.25;
                        break;
                    }
                    case 'masonry': {
                        wallsInfiltration = 0.35;
                        break;
                    }
                }
                let floorInfiltration: number;
                switch (floor) {
                    case 'solid': {
                        floorInfiltration = 0;
                        break;
                    }
                    case 'suspended sealed': {
                        floorInfiltration = 0.1;
                        break;
                    }
                    case 'suspended unsealed': {
                        floorInfiltration = 0.2;
                        break;
                    }
                }
                const draughtLobbyInfiltration = draughtLobby ? 0 : 0.05;
                const windowsDoorsInfiltration = 0.25 - 0.2 * draughtProofedProportion;
                return (
                    additionalInfiltration +
                    wallsInfiltration +
                    floorInfiltration +
                    draughtLobbyInfiltration +
                    windowsDoorsInfiltration
                );
            }
        }
    }

    private get intentionalVentsFluesAirChangesPerHour(): number {
        if (this.dependencies.floors.totalVolume === 0) {
            return 0;
        }
        const intentionalVentsFluesRates = this.input.intentionalVentsFlues.map(
            (v) => v.ventilationRate,
        );
        return sum(intentionalVentsFluesRates) / this.dependencies.floors.totalVolume;
    }

    // in ACH
    @cache
    private get rawAirChangesPerHour(): number {
        return (
            this.structuralAirChangesPerHour + this.intentionalVentsFluesAirChangesPerHour
        );
    }

    private get withShelterFactorAirChangesPerHour(): number {
        return (
            this.dependencies.ventilationInfiltrationCommon.shelterFactor *
            this.rawAirChangesPerHour
        );
    }

    airChangesPerHour(month: Month): number {
        return (
            this.dependencies.ventilationInfiltrationCommon.windFactor(month) *
            this.withShelterFactorAirChangesPerHour
        );
    }

    @cacheMonth
    heatLossMonthly(month: Month): number {
        return (
            this.airChangesPerHour(month) * 0.33 * this.dependencies.floors.totalVolume
        );
    }

    @cache
    get heatLossAverage(): number {
        return mean(Month.all.map((m) => this.heatLossMonthly(m)));
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
        if (this.dependencies.floors.totalVolume !== 0) {
            ventilation.infiltration_chimeneyes_fires_fans =
                this.intentionalVentsFluesAirChangesPerHour;
        }
        switch (this.input.estimateFrom.type) {
            case 'fabric elements': {
                ventilation.structural_infiltration = this.structuralAirChangesPerHour;
                break;
            }
            case 'pressure test': {
                ventilation.structural_infiltration_from_test =
                    this.structuralAirChangesPerHour;
                break;
            }
        }
        ventilation.infiltration_rate = this.rawAirChangesPerHour;
        ventilation.infiltration_rate_incorp_shelter_factor =
            this.withShelterFactorAirChangesPerHour;
        ventilation.adjusted_infiltration = Month.all.map((m) =>
            this.airChangesPerHour(m),
        );
        ventilation.average_infiltration_WK = this.heatLossAverage;
        const infiltrationHeatLossArray = Month.all.map((m) => this.heatLossMonthly(m));
        ventilation.infiltration_WK = infiltrationHeatLossArray;
        data.losses_WK.infiltration = infiltrationHeatLossArray;
    }
    /* eslint-enable */
}
