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
