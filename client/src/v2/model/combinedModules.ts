import { LegacyScenario } from '../legacy-state-validators/scenario';
import { Region } from './enums/region';
import { AirChangeRate } from './modules/air-change-rate';
import {
    Appliances,
    AppliancesInput,
    constructAppliances,
    extractAppliancesInputFromLegacy,
} from './modules/appliances';
import {
    constructCooking,
    Cooking,
    CookingInput,
    extractCookingInputFromLegacy,
} from './modules/cooking';
import { extractFabricInputFromLegacy, Fabric, FabricInput } from './modules/fabric';
import { extractFloorsInputFromLegacy, Floors, FloorsInput } from './modules/floors';
import { extractFuelsInputFromLegacy, Fuels, FuelsDict } from './modules/fuels';
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

export type Input = {
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
};

export const extractInputFromLegacy = (scenario: LegacyScenario): Input => {
    return {
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
    };
};

export class CombinedModules {
    private mutatorModules: {
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
    };

    constructor(input: Input) {
        const { region } = input;
        const fuels = new Fuels(input.fuels);
        const floors = new Floors(input.floors);
        const occupancy = new Occupancy(input.occupancy, { floors });
        const fabric = new Fabric(input.fabric, { region, floors });
        const ventilationInfiltrationCommon = new VentilationInfiltrationCommon(
            input.ventilationInfiltrationCommon,
            { region },
        );
        const ventilation = new Ventilation(input.ventilation, {
            floors,
            ventilationInfiltrationCommon,
        });
        const infiltration = new Infiltration(input.infiltration, {
            fabric,
            floors,
            ventilationInfiltrationCommon,
        });
        const airChangeRate = new AirChangeRate(null, { ventilation, infiltration });
        const heatLoss = new HeatLoss(null, { fabric, ventilation, infiltration });
        const waterCommon = new WaterCommon(input.waterCommon, { occupancy });
        const solarHotWater = constructSolarHotWater(input.solarHotWater, {
            region,
            waterCommon,
        });
        const lighting = new LightingSAP(input.lighting, {
            fuels,
            floors,
            fabric,
            occupancy,
        });
        const appliances = constructAppliances(input.appliances, {
            fuels,
            floors,
            occupancy,
        });
        const cooking = constructCooking(input.cooking, { fuels, floors, occupancy });

        this.mutatorModules = {
            floors,
            occupancy,
            fabric,
            ventilationInfiltrationCommon,
            ventilation,
            infiltration,
            airChangeRate,
            heatLoss,
            waterCommon,
            solarHotWater,
            lighting,
            appliances,
            cooking,
        };
    }

    /* eslint-disable
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-argument,
       @typescript-eslint/no-unsafe-assignment,
       @typescript-eslint/no-unsafe-member-access,
       @typescript-eslint/consistent-type-assertions,
    */
    mutateLegacyData(data: any) {
        for (const mod of Object.values(this.mutatorModules)) {
            mod.mutateLegacyData(data);
        }
    }
    /* eslint-enable */
}
