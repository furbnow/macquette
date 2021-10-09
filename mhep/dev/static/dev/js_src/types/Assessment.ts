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

export interface NewAssessment {
    _commentary: Commentary;
    _report: Report;
    master: Scenario;
    scenario1?: Scenario;
    scenario2?: Scenario;
    scenario3?: Scenario;
    scenario4?: Scenario;
    scenario5?: Scenario;
    scenario6?: Scenario;
    scenario7?: Scenario;
    scenario8?: Scenario;
    scenario9?: Scenario;
}

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
    created_from?: string;
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
    measures: Measures;
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

import { GenerationMeasure } from './Library';
export interface Measures {
    PV_generation?: {
        measure: GenerationMeasure;
    };
}

export interface Ventilation {
    average_ventilation_WK: number;
    average_infiltration_WK: number;
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
