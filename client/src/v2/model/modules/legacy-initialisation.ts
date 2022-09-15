import { defaultsDeep } from 'lodash';

import { defaultFuels } from '../datasets';

export function setDefaultLegacyInputs(data: unknown) {
    const modelDefaults = {
        region: 0,
        altitude: 0,
        LAC_calculation_type: 'SAP',
        fuels: defaultFuels,
        ventilation: {
            air_permeability_test: false,
            air_permeability_value: 0,
            dwelling_construction: 'timberframe',
            suspended_wooden_floor: 0,
            draught_lobby: false,
            percentage_draught_proofed: 0,
            number_of_sides_sheltered: 0,
            ventilation_type: 'NV',
            ventilation_name: 'Unplanned Ventilation (Window Opening Only)',
            system_air_change_rate: 0.5,
            system_specific_fan_power: 3,
            balanced_heat_recovery_efficiency: 65,
            structural_infiltration: 0,
            IVF: [],
            EVP: [],
            CDF: [],
        },
        water_heating: {
            solar_water_heating: false,
            hot_water_control_type: 'no_cylinder_thermostat',
            pipework_insulation: 'Fully insulated primary pipework',
            Vc: 0,
            contains_dedicated_solar_storage_or_WWHRS: 0,
            water_usage: [], // Not used in the model for anything, but seems important for at least one legacy view
        },
        heating_systems: [],
        applianceCarbonCoop: {
            list: [],
        },
    };
    defaultsDeep(data, modelDefaults);
}

function twelveZeroes(): number[] {
    return new Array<number>(12).fill(0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setBlankLegacyOutputs(data: any) {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    data.internal_temperature = [18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18];
    data.external_temperature = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
    data.losses_WK = {};
    data.gains_W = {};
    data.annual_useful_gains_kWh_m2 = {};
    data.annual_losses_kWh_m2 = {};
    data.energy_requirements = {};
    data.fuel_requirements = {
        lighting: { quantity: 0, list: [] },
        cooking: { quantity: 0, list: [] },
        appliances: { quantity: 0, list: [] },
        waterheating: { quantity: 0, list: [] },
        space_heating: { quantity: 0, list: [] },
        fans_and_pumps: { quantity: 0, list: [] },
    };
    data.fuel_totals = {};
    data.mean_internal_temperature = {};
    data.total_cost = 0;
    data.total_income = 0;
    data.primary_energy_use = 0;
    data.kgco2perm2 = 0;
    data.primary_energy_use_bills = 0;
    data.space_heating_demand_m2 = 0;
    data.primary_energy_use_by_requirement = {};
    data.totalWK = 0;
    data.FEE = 0;
    data.SAP = {};
    data.applianceCarbonCoop.energy_demand_total = {
        appliances: 0,
        cooking: 0,
        total: 0,
    };
    data.applianceCarbonCoop.energy_demand_monthly = {
        appliances: twelveZeroes(),
        cooking: twelveZeroes(),
        total: twelveZeroes(),
    };
    data.applianceCarbonCoop.energy_demand_by_type_of_fuel = {
        Electricity: 0,
        Gas: 0,
        Oil: 0,
    };
    data.applianceCarbonCoop.fuel_input_total = {
        appliances: 0,
        cooking: 0,
    };
    data.applianceCarbonCoop.gains_W = {};
    data.applianceCarbonCoop.gains_W_monthly = {};
    /* eslint-enable */
}
