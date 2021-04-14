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

export interface Scenario {
    water_heating: WaterHeating;
    SHW: SolarHotWater;

    scenario_name: string;

    TFA: number;
    volume: number;
    region: string;
    altitude: number;
    occupancy: number;
    occupancy_SAP_value: number;
    use_custom_occupancy: boolean;
    custom_occupancy: number;

    floors: Floor[];
}
export interface Floor {
    area: number;
    name: string;
    height: number;
    volume: number;
}
export interface WaterHeating {
    solar_water_heating: boolean;
    annual_energy_content: number;
    Vd_average: number;
}

export type SolarHotWaterOrientation = 0 | 1 | 2 | 3 | 4;
export type SolarHotWaterPump = 'PV' | 'electric';
export type SolarHotWaterOvershading = 'HEAVY' | 'SIGNIFICANT' | 'MODEST' | 'NONE';

export interface SolarHotWater {
    pump: SolarHotWaterPump;
    A: number;
    n0: number;
    a1: number;
    a2: number;
    a: number;
    Vs: number;
    collector_performance_ratio: number;
    orientation: SolarHotWaterOrientation;
    inclination: number;
    annual_solar: number;
    overshading: SolarHotWaterOvershading;
    solar_energy_available: number;
    solar_load_ratio: number;
    utilisation_factor: number;
    collector_performance_factor: number;
    combined_cylinder_volume: number;
    Veff: number;
    volume_ratio: number;
    f2: number;
    Qs: number;
}
