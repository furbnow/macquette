/* eslint-disable
    @typescript-eslint/strict-boolean-expressions,
    @typescript-eslint/consistent-type-assertions,
    @typescript-eslint/no-unsafe-argument,
    @typescript-eslint/no-unsafe-call,
    @typescript-eslint/no-unsafe-assignment,
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-unsafe-member-access,
*/
import { z } from 'zod';

import { scenarioSchema } from '../../../src/v2/data-schemas/scenario';
import { isTruthy } from '../../../src/v2/helpers/is-truthy';
import { FcInfer } from '../../helpers/arbitraries';
import { stricterParseFloat } from '../../helpers/stricter-parse-float';
import { arbScenarioInputs } from './arbitraries/scenario';

function isValidStringyFloat(value: unknown) {
    return (
        typeof value === 'number' ||
        (typeof value === 'string' && !Number.isNaN(stricterParseFloat(value)))
    );
}

function bug(message: string, context: Record<string, unknown>) {
    return [{ message, context }];
}
const noBug: [] = [];
type Messages = { message: string; context: Record<string, unknown> }[];
function combineBugCheckers(checkers: Array<() => Messages>) {
    const messages = checkers.flatMap((checker) => checker());
    return {
        bugs: messages.length > 0,
        messages,
    };
}

export function checkOutputBugs(legacyScenario: any) {
    function fabricBugs(): Messages {
        const keys = [
            'total_external_area',
            'total_floor_area',
            'total_party_wall_area',
            'total_roof_area',
            'total_wall_area',
            'total_window_area',
        ] as const;
        const { fabric, TFA } = legacyScenario;

        for (const key of keys) {
            if (!isValidStringyFloat(fabric[key])) {
                return bug(`.fabric.${key} was not a valid stringy float`, {
                    key,
                    value: fabric[key],
                });
            }
        }
        if (!isValidStringyFloat(TFA)) {
            return bug('.TFA was not a valid stringy float', { TFA });
        }
        return noBug;
    }

    function solarHotWaterStringConcatenationBug(): Messages {
        const { a1, a2 } = legacyScenario.SHW;
        if (typeof a1 !== 'string') return noBug;
        if (a1 === '0' && a2 >= 0) return noBug;
        if (a1 === '') return noBug;
        return bug(
            '.SHW.a1 and .a2 were strings that could trigger string concatenation bugs',
            { a1, a2 },
        );
    }

    function ventilationStringConcatenationBug(): Messages {
        const { system_air_change_rate, ventilation_type } = legacyScenario.ventilation;
        if (ventilation_type !== 'MV') return noBug;
        if (typeof system_air_change_rate !== 'string') return noBug;
        if (system_air_change_rate === '') return noBug;
        return bug(
            ".ventilation.ventilation_type === 'MV' " +
                'but .ventilation.system_air_change_rate was a potentially bug-inducing string',
            { system_air_change_rate, ventilation_type },
        );
    }

    function floorAreaStringConcatenationBug(): Messages {
        const floorsInit: Array<any> = legacyScenario.floors.slice(
            0,
            legacyScenario.floors.length - 1,
        );
        return floorsInit.flatMap((floor) => {
            if (typeof floor.area === 'string') {
                return bug('some floor area value was a string', {
                    id: floor.id,
                    area: floor.area,
                });
            } else {
                return noBug;
            }
        });
    }

    function wideSpectrumNaNBug(): Messages {
        if (Number.isNaN(stricterParseFloat(legacyScenario.total_cost))) {
            return bug('.total_cost was NaN or an unparsable string', {
                total_cost: legacyScenario.total_cost,
            });
        } else {
            return noBug;
        }
    }

    function ventilationFloorsOverrideBug(): Messages {
        // if num_of_floors_override is 0, legacy treats it as undefined (i.e.
        // no override)
        if (legacyScenario.num_of_floors_override === 0) {
            return bug('.num_floors_override === 0', {});
        }
        if (Number.isNaN(legacyScenario.ventilation.average_WK)) {
            return bug('.ventilation.average_WK is NaN', {});
        } else {
            return noBug;
        }
    }

    function spaceCoolingBug(): Messages {
        // If legacy says we need space cooling, it is wrong
        if (legacyScenario.energy_requirements.space_cooling !== undefined) {
            return bug('.energy_requirements.space_cooling is not undefined', {});
        }
        return noBug;
    }

    return combineBugCheckers([
        fabricBugs,
        wideSpectrumNaNBug,
        solarHotWaterStringConcatenationBug,
        ventilationStringConcatenationBug,
        ventilationFloorsOverrideBug,
        floorAreaStringConcatenationBug,
        spaceCoolingBug,
    ]);
}

export function checkInputBugs(inputs: z.input<typeof scenarioSchema>) {
    function spaceHeatingEnergyRequirementsBugs(): Messages {
        if (
            inputs !== undefined &&
            typeof inputs['space_heating'] !== 'object' &&
            (inputs?.heating_systems ?? []).length !== 0
        ) {
            /*
            In the legacy model:

            In calc.metabolic_losses_fans_and_pumps_gains: if
            data.space_heating is not set (or more precisely not set to an
            object), then data.gains_W['metabolic'] is set to [] (when it
            should be an array with 12 elements)

            In calc.space_heating: if data.gains_W['metabolic'] is [], then
            annual_heating_demand is NaN, meaning
            data.energy_requirements.space_heating does not get set

            In calc.heating_systems: if data.heating_systems is a non-empty
            array, then data.energy_requirements.space_heating.quantity is
            accessed, causing a TypeError to be thrown

            So if we specify heating systems, we must also specify
            space_heating.

            Got that?
            */
            return bug(
                '.space_heating was undefined but heating systems were specified',
                {},
            );
        } else {
            return noBug;
        }
    }

    function solarHotWaterFlagBug(): Messages {
        // These two values should be kept in sync. If, for example, use_SHW is
        // truthy and water_heating.solar_water_heating is falsy, then SHW will
        // be calculated but not factored in to the main water heating module.
        const isBug =
            isTruthy(inputs?.use_SHW) !==
            isTruthy(inputs?.water_heating?.solar_water_heating);
        return isBug
            ? bug('mismatch between .use_SHW and .water_heating.solar_water_heating', {
                  use_SHW: inputs?.use_SHW,
                  solar_water_heating: inputs?.water_heating?.solar_water_heating,
              })
            : noBug;
    }

    function heatingSystemCombiTypeBug(): Messages {
        return (
            inputs?.heating_systems?.flatMap((system) => {
                if (system.combi_loss === 'Storage combi boiler  55 litres') {
                    return bug('some heating system had a buggy value for .combi_loss', {
                        id: (system as any).id,
                        combi_loss: system.combi_loss,
                    });
                } else {
                    return noBug;
                }
            }) ?? noBug
        );
    }

    function heatingSystemCombiWithPrimaryCircuitBug(): Messages {
        // Primary circuit losses are fixed as 0 when a combi boiler is
        // configured, so primary_circuit_loss should not be 'Yes'
        return (
            inputs?.heating_systems?.flatMap((system) => {
                if (system.combi_loss === 0 || system.combi_loss === '0') {
                    return noBug;
                }
                if (system.primary_circuit_loss === 'No') {
                    return noBug;
                }
                return bug(
                    'some heating system was specified as a combi boiler, but with a primary circuit',
                    {
                        id: (system as any).id,
                        combi_loss: system.combi_loss,
                        primary_circuit_loss: system.primary_circuit_loss,
                    },
                );
            }) ?? noBug
        );
    }

    function heatingSystemPrimaryCircuitInvariants(): Messages {
        return (
            inputs?.heating_systems?.flatMap((system) => {
                if (system.primary_circuit_loss === 'No') {
                    return noBug;
                }
                const context = {
                    id: (system as any).id,
                    combi_loss: system.combi_loss,
                };
                if (inputs?.water_heating?.pipework_insulation === undefined) {
                    return bug(
                        'some heating system was specified as having primary circuit loss, but no value was provided for pipework insulation',
                        context,
                    );
                }
                if (inputs.water_heating?.hot_water_control_type === undefined) {
                    return bug(
                        'some heating system was specified as having primary circuit loss, but no value was provided for hot water control type',
                        context,
                    );
                }
                return noBug;
            }) ?? noBug
        );
    }

    function fuelBugs(): Messages {
        if (inputs?.fuels === undefined) {
            return noBug;
        }
        return Object.entries(inputs?.fuels).flatMap(([fuelName, fuelData]) => {
            if (typeof fuelData.standingcharge === 'string') {
                return bug(
                    'some fuel had a stringy number for its standing charge, which causes string concatenation errors if this fuel is used for anything',
                    { fuelName },
                );
            }
            return noBug;
        });
    }

    function generationStringConcatenationBug(): Messages {
        if (inputs?.generation === undefined) {
            return noBug;
        }
        const { solar_annual_kwh, wind_annual_kwh, hydro_annual_kwh } =
            inputs.generation as any;
        const castThenSummed =
            1.0 * solar_annual_kwh + 1.0 * wind_annual_kwh + 1.0 * hydro_annual_kwh;
        const summedThenCast =
            // SAFETY: We are deliberately invoking weird JS behaviour with the + operator
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            1.0 * (solar_annual_kwh + wind_annual_kwh + hydro_annual_kwh);
        if (castThenSummed !== summedThenCast) {
            return bug('generation inputs will cause string concat bug', {
                solar_annual_kwh,
                wind_annual_kwh,
                hydro_annual_kwh,
            });
        }
        return noBug;
    }

    return combineBugCheckers([
        spaceHeatingEnergyRequirementsBugs,
        solarHotWaterFlagBug,
        heatingSystemCombiTypeBug,
        heatingSystemCombiWithPrimaryCircuitBug,
        heatingSystemPrimaryCircuitInvariants,
        fuelBugs,
        generationStringConcatenationBug,
    ]);
}

export function hasNewBehaviour(inputs: FcInfer<typeof arbScenarioInputs>): boolean {
    // SHW
    const shwIsEnabled = isTruthy(
        inputs?.use_SHW || inputs?.water_heating?.solar_water_heating,
    );
    const shwHasNewDataStructure =
        inputs?.SHW !== undefined && 'version' in inputs.SHW && inputs.SHW.version >= 1;
    const shwHasNewBehaviour = shwIsEnabled && shwHasNewDataStructure;

    // FUVC
    const hasNewFuvcFloor =
        inputs?.fabric?.elements?.some(
            (element) =>
                (element.type === 'floor' || element.type === 'Floor') &&
                element.perFloorTypeSpec !== null &&
                element.selectedFloorType !== null,
        ) ?? false;

    return shwHasNewBehaviour || hasNewFuvcFloor;
}
