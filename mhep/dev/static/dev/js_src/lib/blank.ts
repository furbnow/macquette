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
            primary_energy_use_m2: NaN,
            kgco2perm2: NaN,
            kwhdpp: NaN,
            floors: [],
            fuels: {},
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
                total_floor_WK: NaN,
                total_window_WK: NaN,
                total_wall_WK: NaN,
                total_roof_WK: NaN,
                thermal_bridging_heat_loss: NaN,
            },
            ventilation: {
                average_ventilation_WK: NaN,
                average_infiltration_WK: NaN,
            },
            currentenergy: {
                primaryenergy_annual_kwh: NaN,
                total_co2: NaN,
                total_cost: NaN,
                annual_net_cost: NaN,
                primaryenergy_annual_kwhm2: NaN,
                total_co2m2: NaN,
                energyuseperperson: NaN,
                onsite_generation: false,

                generation: {
                    annual_generation: NaN,
                    annual_CO2: NaN,
                    primaryenergy: NaN,
                    fraction_used_onsite: NaN,
                    annual_savings: NaN,
                    annual_FIT_income: NaN,
                },
                use_by_fuel: {},
            },
        },
    };
    return blank;
}
