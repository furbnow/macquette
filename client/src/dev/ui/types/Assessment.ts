import {
    GenerationMeasure,
    VentilationSystemMeasure,
    DraughtProofingMeasure,
    ClothesDryingItem,
    IntentionalVentMeasure,
    ExtractVentilationMeasure,
} from './Library';
import { VentilationSystem, IntentionalVent } from './Library';

export interface AssessmentMeta {
    id: string;
    name: string;
    description: string;
    status: 'In progress' | 'Completed' | 'Test';

    user: { id: string; name: string; email: string };
    organisation: { id: string; name: string } | null;

    created_at: string;
    updated_at: string;

    data: NewAssessment;
}

export type ScenarioString =
    | 'scenario1'
    | 'scenario2'
    | 'scenario3'
    | 'scenario4'
    | 'scenario5'
    | 'scenario6'
    | 'scenario7'
    | 'scenario8'
    | 'scenario9'
    | 'master';

export type NewAssessment = {
    _commentary: Commentary;
    _report: Report;
} & Partial<Record<ScenarioString, Scenario>>;

export interface Report {
    date: string;
    version: string;
}

export interface Commentary {
    brief: string;
    context: string;
    decisions: string;
    scenarios: CommentaryScenarios;
}

export interface CommentaryScenarios {
    [key: string]: string;
}

//
// A scenario
//
export type Scenario = {
    scenario_name: string;
    locked: boolean;
    created_from?: ScenarioString;
    creation_hash: number | null;

    water_heating: WaterHeating;
    SHW: SolarHotWater;
    currentenergy: CurrentEnergy;
    fuels: { [key: string]: Fuel };
    floors: Floor[];
    measures: Measures;
    fabric: Fabric;
    ventilation: Ventilation;
    generation: Generation;
    household: Household;
} & ScenarioInputs &
    ScenarioOutputs;

export interface ScenarioInputs {
    region: number | null;
    altitude: number | null;
    use_custom_occupancy: boolean;
    custom_occupancy: number | null;
    use_num_of_floors_override: boolean;
    num_of_floors_override: number | null;
}
export interface ScenarioOutputs {
    readonly volume: number;
    readonly TFA: number;
    readonly occupancy: number;
    readonly occupancy_SAP_value: number;
    readonly space_heating_demand_m2: number;
    readonly primary_energy_use_m2: number;
    readonly kgco2perm2: number;
    readonly kwhdpp: number;
    readonly num_of_floors: number;
}

//
// Current energy
//

export interface CurrentEnergy {
    primaryenergy_annual_kwh: number;
    total_co2: number;
    total_cost: number;
    annual_net_cost: number;
    primaryenergy_annual_kwhm2: number;
    total_co2m2: number;
    energyuseperperson: number;
    onsite_generation: boolean;

    generation: CurrentEnergyGeneration;
    use_by_fuel: { [key: string]: FuelUse };
}

export interface CurrentEnergyGeneration {
    annual_generation: number | null;
    annual_CO2: number;
    primaryenergy: number;
    fraction_used_onsite: number | null;
    annual_savings: number;
    annual_FIT_income: number | null;
}

export interface FuelUse {
    annual_co2: number;
    annual_use: number | null;
    annualcost: number;
    primaryenergy: number;
}

export interface Fuel {
    SAP_code: number;
    category: string;
    co2factor: number;
    fuelcost: number;
    primaryenergyfactor: number;
    standingcharge: number;
}

export interface Floor {
    area: number | null;
    name: string;
    height: number | null;
    volume: number | null;
}
export interface WaterHeating {
    solar_water_heating: boolean;
    annual_energy_content: number;
    Vd_average: number;
}
export interface Fabric {
    measures: Record<never, never>;
    elements: FabricElement[];
    total_floor_WK: number;
    total_window_WK: number;
    total_wall_WK: number;
    total_roof_WK: number;
    thermal_bridging_heat_loss: number;
}
export interface FabricElement {
    cost_total?: number;
}

export interface Measures {
    PV_generation?: {
        measure: GenerationMeasure & { quantity: number; cost_total: number };
        original_annual_generation: number | null;
    };
    ventilation: {
        ventilation_systems_measures?: {
            measure: VentilationSystemMeasure;
        };
        draught_proofing_measures?: {
            measure: DraughtProofingMeasure;
        };
        extract_ventilation_points?: ExtractVentilationMeasure[];
        clothes_drying_facilities?: Record<
            number,
            {
                measure: ClothesDryingItem & { id: number };
            }
        >;
        intentional_vents_and_flues_measures?: Record<
            number,
            {
                measure: IntentionalVentMeasure & { id: number };
            }
        >;
    };
}

export interface Ventilation extends VentilationSystem {
    // TODO: ventilation_tag, _name and system_specific_fan_power are all duplicates
    // of stuff in VentilationSystem for reasons better known to someone else.
    ventilation_tag: string;
    ventilation_name: string;
    system_specific_fan_power: string;
    average_ventilation_WK: number;
    average_infiltration_WK: number;
    infiltration_rate_incorp_shelter_factor: number;
    number_of_sides_sheltered: number | null;
    air_permeability_test: boolean;
    air_permeability_value: number | null;
    dwelling_construction: VentilationDwellingConstruction | null;
    suspended_wooden_floor: VentilationSuspendedWoodenFloor | null;
    percentage_draught_proofed: number | null;
    draught_lobby: boolean;
    IVF: (IntentionalVent & { id: number; location: string })[];
    CDF: (ClothesDryingItem & { id: number })[];
    EVP: {
        id: number;
        tag: string;
        name: string;
        type: string;
        ventilation_rate: string;
        location: string;
    }[];
}

export interface Generation {
    use_PV_calculator: boolean;
    solar_annual_kwh: number | null;
    solar_fraction_used_onsite: number | null;
    solar_FIT: number | null;
    solar_export_FIT: number | null;
    wind_annual_kwh: number | null;
    wind_fraction_used_onsite: number | null;
    wind_FIT: number | null;
    wind_export_FIT: number | null;
    hydro_annual_kwh: number | null;
    hydro_fraction_used_onsite: number | null;
    hydro_FIT: number | null;
    hydro_export_FIT: number | null;
    solarpv_kwp_installed: number | null;
    solarpv_orientation: number | null;
    solarpv_inclination: number | null;
    solarpv_overshading: number | null;
}

export interface Household {
    assessor_name: string;
    householder_name: string;
    address_1: string;
    address_2: string;
    address_3: string;
    address_town: string;
    address_postcode: string;
    address_la: string;
    address_lsoa: string;
}

//
// Solar hot water
//

export type SolarHotWater = SolarHotWaterInputs & SolarHotWaterOutputs;
export interface SolarHotWaterInputs {
    // Inputs
    pump: SolarHotWaterPump | null;
    A: number | null;
    n0: number | null;
    a1: number | null;
    a2: number | null;
    orientation: SolarHotWaterOrientation | null;
    inclination: number | null;
    overshading: SolarHotWaterOvershading | null;
    Vs: number | null;
    combined_cylinder_volume: number | null;
}
export interface SolarHotWaterOutputs {
    readonly a: number;
    readonly collector_performance_ratio: number;
    readonly annual_solar: number;
    readonly solar_energy_available: number;
    readonly solar_load_ratio: number;
    readonly utilisation_factor: number;
    readonly collector_performance_factor: number;
    readonly Veff: number;
    readonly volume_ratio: number;
    readonly f2: number;
    readonly Qs: number;
}
export type SolarHotWaterOrientation = 0 | 1 | 2 | 3 | 4;
export type SolarHotWaterPump = 'PV' | 'electric';
export type SolarHotWaterOvershading = 'HEAVY' | 'SIGNIFICANT' | 'MODEST' | 'NONE';

export type VentilationDwellingConstruction = 'timberframe' | 'masonry';
export type VentilationSuspendedWoodenFloor = 'unsealed' | 'sealed' | '0';
