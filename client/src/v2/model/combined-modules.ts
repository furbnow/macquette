import { ModelBehaviourVersion, scenarioSchema } from '../data-schemas/scenario';
import { Region } from './enums/region';
import { AirChangeRate } from './modules/air-change-rate';
import {
    Appliances,
    AppliancesInput,
    constructAppliances,
    extractAppliancesInputFromLegacy,
} from './modules/appliances';
import { constructModelBehaviourFlags } from './modules/behaviour-version';
import {
    constructCooking,
    Cooking,
    CookingInput,
    extractCookingInputFromLegacy,
} from './modules/cooking';
import { extractFabricInputFromLegacy, Fabric, FabricInput } from './modules/fabric';
import { extractFloorsInputFromLegacy, Floors, FloorsInput } from './modules/floors';
import { extractFuelsInputFromLegacy, Fuels, FuelsDict } from './modules/fuels';
import {
    extractGenerationInputFromLegacy,
    Generation,
    GenerationInput,
} from './modules/generation';
import { HeatLoss } from './modules/heat-loss';
import {
    extractLightingSAPInputFromLegacy,
    LightingSAP,
    LightingSAPInput,
} from './modules/lighting-appliances-cooking/lighting-sap';
import {
    extractOccupancyInputFromLegacy,
    Occupancy,
    OccupancyInput,
} from './modules/occupancy';
import { extractRegionFromLegacy } from './modules/region';
import {
    extractSolarHotWaterInputFromLegacy,
    constructSolarHotWater,
    SolarHotWaterInput,
    SolarHotWater,
} from './modules/solar-hot-water';
import {
    extractVentilationInfiltrationCommonInputFromLegacy,
    VentilationInfiltrationCommon,
    VentilationInfiltrationCommonInput,
} from './modules/ventilation-infiltration/common-input';
import {
    extractInfiltrationInputFromLegacy,
    Infiltration,
    InfiltrationInput,
} from './modules/ventilation-infiltration/infiltration';
import {
    extractVentilationInputFromLegacy,
    Ventilation,
    VentilationInput,
} from './modules/ventilation-infiltration/ventilation';
import {
    extractWaterCommonInputFromLegacy,
    WaterCommon,
    WaterCommonInput,
} from './modules/water-common';
import {
    extractWaterHeatingInputFromLegacy,
    WaterHeating,
    WaterHeatingInput,
} from './modules/water-heating';

export type Input = {
    modelBehaviourVersion: ModelBehaviourVersion;
    fuels: FuelsDict;
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
};

export function extractInputFromLegacy(rawScenario: unknown): Input {
    const scenario = scenarioSchema.parse(rawScenario);
    return {
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
    };
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

    constructor(input: Input) {
        const { region } = input;
        const modelBehaviourFlags = constructModelBehaviourFlags(
            input.modelBehaviourVersion,
        );
        const fuels = new Fuels(input.fuels);
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
            fuels,
            floors: this.floors,
            fabric: this.fabric,
            occupancy: this.occupancy,
        });
        this.appliances = constructAppliances(input.appliances, {
            modelBehaviourFlags,
            fuels,
            floors: this.floors,
            occupancy: this.occupancy,
        });
        this.cooking = constructCooking(input.cooking, {
            fuels,
            floors: this.floors,
            occupancy: this.occupancy,
        });
        this.waterHeating = new WaterHeating(input.waterHeating, {
            waterCommon: this.waterCommon,
            solarHotWater: this.solarHotWater,
        });
        this.generation = new Generation(input.generation, {
            modelBehaviourFlags,
            region,
            fuels,
        });
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
        ];
        for (const mod of Object.values(mutatorModules)) {
            mod.mutateLegacyData(data);
        }
        data.model = this;
    }
    /* eslint-enable */

    toJSON(): unknown {
        return null;
    }
}
