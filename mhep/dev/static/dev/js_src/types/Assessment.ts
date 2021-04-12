export interface NewAssessment {
    _commentary: any;
    _report: any;
    [key: string]: Scenario;
}

export interface Scenario {
    water_heating: WaterHeating;
    SHW: SolarHotWater;
}

export interface WaterHeating {
    solar_water_heating: boolean;
    annual_energy_content: number;
    Vd_average: number;
}

export interface SolarHotWater {
    pump: 'PV' | 'electric';
    A: number;
    n0: number;
    a1: number;
    a2: number;
    a: number;
    Vs: number;
    collector_performance_ratio: number;
    orientation: string;
    inclination: number;
    annual_solar: number;
    overshading: string;
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
