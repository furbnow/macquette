import { ZodError } from 'zod';

import { ModelBehaviourVersion, scenarioSchema } from '../data-schemas/scenario';
import { Result } from '../helpers/result';
import { Region } from './enums/region';
import { ModelError } from './error';
import { AirChangeRate } from './modules/air-change-rate';
import {
    Appliances,
    AppliancesInput,
    constructAppliances,
    extractAppliancesInputFromLegacy,
} from './modules/appliances';
import { constructModelBehaviourFlags } from './modules/behaviour-version';
import {
    Cooking,
    CookingInput,
    constructCooking,
    extractCookingInputFromLegacy,
} from './modules/cooking';
import {
    CurrentEnergy,
    CurrentEnergyInput,
    extractCurrentEnergyInputFromLegacy,
} from './modules/current-energy';
import { Fabric, FabricInput, extractFabricInputFromLegacy } from './modules/fabric';
import { Floors, FloorsInput, extractFloorsInputFromLegacy } from './modules/floors';
import { Fuels, FuelsDict, extractFuelsInputFromLegacy } from './modules/fuels';
import {
    Generation,
    GenerationInput,
    extractGenerationInputFromLegacy,
} from './modules/generation';
import { HeatLoss } from './modules/heat-loss';
import {
    HeatingSystemInput,
    HeatingSystems,
    extractHeatingSystemsInputFromLegacy,
} from './modules/heating-systems';
import { FansAndPumpsGains } from './modules/internal-gains/fans-and-pumps';
import { InternalLosses } from './modules/internal-gains/losses';
import { MetabolicGains } from './modules/internal-gains/metabolic';
import {
    LightingSAP,
    LightingSAPInput,
    extractLightingSAPInputFromLegacy,
} from './modules/lighting-appliances-cooking/lighting-sap';
import {
    Occupancy,
    OccupancyInput,
    extractOccupancyInputFromLegacy,
} from './modules/occupancy';
import { extractRegionFromLegacy } from './modules/region';
import {
    SolarHotWater,
    SolarHotWaterInput,
    constructSolarHotWater,
    extractSolarHotWaterInputFromLegacy,
} from './modules/solar-hot-water';
import {
    VentilationInfiltrationCommon,
    VentilationInfiltrationCommonInput,
    extractVentilationInfiltrationCommonInputFromLegacy,
} from './modules/ventilation-infiltration/common-input';
import {
    Infiltration,
    InfiltrationInput,
    extractInfiltrationInputFromLegacy,
} from './modules/ventilation-infiltration/infiltration';
import {
    Ventilation,
    VentilationInput,
    extractVentilationInputFromLegacy,
} from './modules/ventilation-infiltration/ventilation';
import {
    WaterCommon,
    WaterCommonInput,
    extractWaterCommonInputFromLegacy,
} from './modules/water-common';
import {
    WaterHeating,
    WaterHeatingInput,
    extractWaterHeatingInputFromLegacy,
} from './modules/water-heating';

export type Input = {
    modelBehaviourVersion: ModelBehaviourVersion;
    fuels: { fuels: FuelsDict };
    floors: FloorsInput;
    occupancy: OccupancyInput;
    region: Region;
    fabric: FabricInput;
    ventilationInfiltrationCommon: VentilationInfiltrationCommonInput;
    ventilation: VentilationInput;
    infiltration: InfiltrationInput;
    waterCommon: WaterCommonInput;
    solarHotWater: SolarHotWaterInput;
    lighting: LightingSAPInput;
    appliances: AppliancesInput;
    cooking: CookingInput;
    waterHeating: WaterHeatingInput;
    generation: GenerationInput;
    currentEnergy: CurrentEnergyInput;
    heatingSystems: HeatingSystemInput[];
};

export function extractInputFromLegacy(
    rawScenario: unknown,
): Result<Input, ZodError | ModelError> {
    const parseResult = scenarioSchema.safeParse(rawScenario);
    if (parseResult.success === false) {
        return Result.err(parseResult.error);
    }
    try {
        const scenario = parseResult.data;
        return Result.ok({
            modelBehaviourVersion: scenario?.modelBehaviourVersion ?? 'legacy',
            fuels: extractFuelsInputFromLegacy(scenario),
            floors: extractFloorsInputFromLegacy(scenario),
            occupancy: extractOccupancyInputFromLegacy(scenario),
            region: extractRegionFromLegacy(scenario),
            fabric: extractFabricInputFromLegacy(scenario),
            ventilationInfiltrationCommon:
                extractVentilationInfiltrationCommonInputFromLegacy(scenario),
            ventilation: extractVentilationInputFromLegacy(scenario),
            infiltration: extractInfiltrationInputFromLegacy(scenario),
            waterCommon: extractWaterCommonInputFromLegacy(scenario),
            solarHotWater: extractSolarHotWaterInputFromLegacy(scenario),
            lighting: extractLightingSAPInputFromLegacy(scenario),
            appliances: extractAppliancesInputFromLegacy(scenario),
            cooking: extractCookingInputFromLegacy(scenario),
            waterHeating: extractWaterHeatingInputFromLegacy(scenario),
            generation: extractGenerationInputFromLegacy(scenario),
            currentEnergy: extractCurrentEnergyInputFromLegacy(scenario),
            heatingSystems: extractHeatingSystemsInputFromLegacy(scenario),
        });
    } catch (err) {
        if (err instanceof ModelError) {
            return Result.err(err);
        }
        throw err;
    }
}

export class CombinedModules {
    floors: Floors;
    occupancy: Occupancy;
    fabric: Fabric;
    ventilationInfiltrationCommon: VentilationInfiltrationCommon;
    ventilation: Ventilation;
    infiltration: Infiltration;
    airChangeRate: AirChangeRate;
    heatLoss: HeatLoss;
    waterCommon: WaterCommon;
    solarHotWater: SolarHotWater;
    lighting: LightingSAP;
    appliances: Appliances;
    cooking: Cooking;
    waterHeating: WaterHeating;
    generation: Generation;
    currentEnergy: CurrentEnergy;
    fuels: Fuels;
    metabolicGains: MetabolicGains;
    internalLosses: InternalLosses;
    fansAndPumpsGains: FansAndPumpsGains;

    constructor(input: Input) {
        const { region } = input;
        const modelBehaviourFlags = constructModelBehaviourFlags(
            input.modelBehaviourVersion,
        );
        this.fuels = new Fuels(input.fuels);
        this.floors = new Floors(input.floors);
        this.occupancy = new Occupancy(input.occupancy, { floors: this.floors });
        this.fabric = new Fabric(input.fabric, { region, floors: this.floors });
        this.ventilationInfiltrationCommon = new VentilationInfiltrationCommon(
            input.ventilationInfiltrationCommon,
            { region },
        );
        this.ventilation = new Ventilation(input.ventilation, {
            floors: this.floors,
            ventilationInfiltrationCommon: this.ventilationInfiltrationCommon,
        });
        this.infiltration = new Infiltration(input.infiltration, {
            fabric: this.fabric,
            floors: this.floors,
            ventilationInfiltrationCommon: this.ventilationInfiltrationCommon,
        });
        this.airChangeRate = new AirChangeRate(null, {
            ventilation: this.ventilation,
            infiltration: this.infiltration,
        });
        this.heatLoss = new HeatLoss(null, {
            fabric: this.fabric,
            ventilation: this.ventilation,
            infiltration: this.infiltration,
        });
        this.waterCommon = new WaterCommon(input.waterCommon, {
            occupancy: this.occupancy,
        });
        this.solarHotWater = constructSolarHotWater(input.solarHotWater, {
            region,
            waterCommon: this.waterCommon,
        });
        this.lighting = new LightingSAP(input.lighting, {
            fuels: this.fuels,
            floors: this.floors,
            fabric: this.fabric,
            occupancy: this.occupancy,
        });
        this.appliances = constructAppliances(input.appliances, {
            modelBehaviourFlags,
            fuels: this.fuels,
            floors: this.floors,
            occupancy: this.occupancy,
        });
        this.cooking = constructCooking(input.cooking, {
            fuels: this.fuels,
            floors: this.floors,
            occupancy: this.occupancy,
        });
        const heatingSystems = new HeatingSystems(input.heatingSystems, {
            floors: this.floors,
            waterCommon: this.waterCommon,
        });
        this.waterHeating = new WaterHeating(input.waterHeating, {
            heatingSystems,
            waterCommon: this.waterCommon,
            solarHotWater: this.solarHotWater,
        });
        this.generation = new Generation(input.generation, {
            modelBehaviourFlags,
            region,
            fuels: this.fuels,
        });
        this.currentEnergy = new CurrentEnergy(input.currentEnergy, {
            fuels: this.fuels,
            modelBehaviourFlags,
        });
        this.metabolicGains = new MetabolicGains(null, { occupancy: this.occupancy });
        this.internalLosses = new InternalLosses(null, { occupancy: this.occupancy });
        this.fansAndPumpsGains = new FansAndPumpsGains(null, {
            ventilation: this.ventilation,
            heatingSystems,
        });
    }

    static fromLegacy(datain: unknown): Result<CombinedModules, ZodError | ModelError> {
        const inputsR = extractInputFromLegacy(datain);
        if (inputsR.isErr()) {
            return inputsR;
        }

        try {
            return Result.ok(new CombinedModules(inputsR.unwrap()));
        } catch (err) {
            if (err instanceof ModelError) {
                return Result.err(err);
            } else {
                console.error('Non-ModelError exception in CombinedModules');
                throw err;
            }
        }
    }

    /* eslint-disable
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-argument,
       @typescript-eslint/no-unsafe-assignment,
       @typescript-eslint/no-unsafe-member-access,
       @typescript-eslint/consistent-type-assertions,
    */
    mutateLegacyData(data: any) {
        const mutatorModules = [
            this.floors,
            this.occupancy,
            this.fabric,
            this.ventilationInfiltrationCommon,
            this.ventilation,
            this.infiltration,
            this.airChangeRate,
            this.heatLoss,
            this.waterCommon,
            this.solarHotWater,
            this.lighting,
            this.appliances,
            this.cooking,
            this.waterHeating,
            this.generation,
            this.currentEnergy,
            this.metabolicGains,
            this.internalLosses,
            this.fansAndPumpsGains,
        ];
        for (const mod of Object.values(mutatorModules)) {
            mod.mutateLegacyData(data);
        }
        data.model = Result.ok(this);
    }
    /* eslint-enable */

    toJSON(): unknown {
        return null;
    }
}
