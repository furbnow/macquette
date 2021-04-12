import { NewAssessment } from '../types/Assessment';

export default function blank(): NewAssessment {
    const blank: NewAssessment = {
        _commentary: {
            brief: '',
            context: '',
            decisions: '',
            scenarios: {},
        },
        _report: {
            date: '',
            version: '',
        },
        master: {
            scenario_name: 'Baseline',
            locked: false,
            creation_hash: null,
            region: null,
            altitude: null,
            use_custom_occupancy: false,
            custom_occupancy: null,
            volume: NaN,
            TFA: NaN,
            occupancy: NaN,
            occupancy_SAP_value: NaN,
            space_heating_demand_m2: NaN,
            floors: [],
            water_heating: {
                solar_water_heating: false,
                annual_energy_content: NaN,
                Vd_average: NaN,
            },
            SHW: {
                pump: null,
                A: null,
                n0: null,
                a1: null,
                a2: null,
                orientation: null,
                inclination: null,
                overshading: null,
                Vs: null,
                combined_cylinder_volume: null,
                a: NaN,
                collector_performance_ratio: NaN,
                annual_solar: NaN,
                solar_energy_available: NaN,
                solar_load_ratio: NaN,
                utilisation_factor: NaN,
                collector_performance_factor: NaN,
                Veff: NaN,
                volume_ratio: NaN,
                f2: NaN,
                Qs: NaN,
            },
            measures: {},
            fabric: {
                measures: {},
                elements: [],
            },
        },
    };
    return blank;
}
