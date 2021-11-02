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
            num_of_floors: NaN,
            num_of_floors_override: NaN,
            use_num_of_floors_override: false,
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
            measures: {
                ventilation: {},
            },
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
                tag: '',
                tags: [],
                name: '',
                source: '',
                specific_fan_power: '',
                ventilation_tag: '',
                ventilation_type: '',
                ventilation_name: '',
                average_ventilation_WK: NaN,
                average_infiltration_WK: NaN,
                system_air_change_rate: '',
                system_specific_fan_power: '',
                balanced_heat_recovery_efficiency: '',
                number_of_sides_sheltered: NaN,
                air_permeability_test: false,
                air_permeability_value: NaN,
                infiltration_rate_incorp_shelter_factor: NaN,
                suspended_wooden_floor: null,
                percentage_draught_proofed: NaN,
                draught_lobby: false,
                dwelling_construction: null,
                IVF: [],
                CDF: [],
                EVP: [],
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
            generation: {
                use_PV_calculator: false,
                solar_annual_kwh: null,
                solar_fraction_used_onsite: null,
                solar_FIT: null,
                solar_export_FIT: null,
                wind_annual_kwh: null,
                wind_fraction_used_onsite: null,
                wind_FIT: null,
                wind_export_FIT: null,
                hydro_annual_kwh: null,
                hydro_fraction_used_onsite: null,
                hydro_FIT: null,
                hydro_export_FIT: null,
                solarpv_kwp_installed: null,
                solarpv_orientation: null,
                solarpv_inclination: null,
                solarpv_overshading: null,
            },
            household: {
                assessor_name: '',
                householder_name: '',
                address_1: '',
                address_2: '',
                address_3: '',
                address_town: '',
                address_postcode: '',
                address_la: '',
                address_lsoa: '',
            },
        },
    };
    return blank;
}
