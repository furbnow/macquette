/* eslint-disable */
let z;
import { datasets } from '../reference-datasets';

/*---------------------------------------------------------------------------------------------
 // VENTILATION
 // Inputs from user:
 //      - data.ventilation.ventilation_type
 //      - data.ventilation.IVF
 //      - data.ventilation.EVP
 //      - data.ventilation.dwelling_construction
 //      - data.ventilation.suspended_wooden_floor
 //      - data.ventilation.suspended_wooden_floor
 //      - data.ventilation.draught_lobby
 //      - data.ventilation.percentage_draught_proofed
 //      - data.ventilation.air_permeability_test
 //      - data.ventilation.air_permeability_value
 //      - data.ventilation.number_of_sides_sheltered
 //      - data.ventilation.system_air_change_rate
 //      - data.ventilation.balanced_heat_recovery_efficiency
 //
 // Inputs from other modules:
 //      - data.volume
 //      - data.num_of_floors
 //      - data.region
 //
 // Global Outputs:
 //      - data.losses_WK.ventilation
 //
 // Module variables:
 //      - data.ventilation.infiltration_chimeneyes_fires_fans
 //      - data.ventilation.infiltration_rate // includes chimneys and fans
 //      - data.ventilation.EVP_air_changes
 //      - data.ventilation.infiltration_rate_incorp_shelter_factor
 //      - data.ventilation.windfactor // monthly
 //      - data.ventilation.adjusted_infiltration // monthly
 //      - data.ventilation.adjusted_EVP_air_changes // monthly
 //      - data.ventilation.average_WK
 //      - data.ventilation.average_infiltration_WK
 //      - data.ventilation.average_ventilation_WK
 //      - data.ventilation.effective_air_change_rate
 //      - data.ventilation.infiltration_WK
 //      - data.ventilation.ventilation_WK
 //      - data.losses_WK.ventilation
 //      - data.losses_WK.infiltration
 //      - data.ventilation.SAP_ventilation_WK // includes loses due to the ventilation system and infiltration
 //      - data.totalWK_monthly
 //
 // Datasets:
 //      - datasets.table_u2
 //
 //---------------------------------------------------------------------------------------------*/

export function legacyVentilation(data) {
    let defaults = {
        air_permeability_test: false,
        air_permeability_value: 0,
        dwelling_construction: 'timberframe',
        suspended_wooden_floor: 0, // 'unsealed', 'sealed', 0
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
    };
    if (data.ventilation == undefined) {
        data.ventilation = {};
    }
    for (z in defaults) {
        if (data.ventilation[z] == undefined) {
            data.ventilation[z] = defaults[z];
        }
    }

    let total_IVF = 0;
    let total_EVP = 0;
    // Intentional vents and flues (IVF: Chimneys, open flues and flueless gas fires)
    for (z in data.ventilation.IVF) {
        total_IVF += 1.0 * data.ventilation.IVF[z].ventilation_rate;
    }
    // According to SAP2012 the loses due to EVP are "infiltration loses" but after
    // discussion (GIT issue 177: https://github.com/emoncms/MyHomeEnergyPlanner/issues/177)
    // we have decided to consider them "ventilation losses"
    if (
        data.ventilation.ventilation_type == 'IE' ||
        data.ventilation.ventilation_type == 'PS'
    ) {
        for (z in data.ventilation.EVP) {
            total_EVP += 1.0 * data.ventilation.EVP[z].ventilation_rate;
        }
    }

    let infiltration = 0;
    let EVP_air_changes = 0;

    if (data.volume != 0) {
        infiltration = total_IVF / data.volume;
        EVP_air_changes = total_EVP / data.volume;
        data.ventilation.infiltration_chimeneyes_fires_fans = infiltration;
    }

    // Strucutral infiltration
    const num_of_floors = data.num_of_floors_override
        ? data.num_of_floors_override
        : data.num_of_floors;
    data.ventilation.structural_infiltration = (num_of_floors - 1) * 0.1;
    if (data.ventilation.dwelling_construction == 'timberframe') {
        data.ventilation.structural_infiltration += 0.25;
    }
    if (data.ventilation.dwelling_construction == 'masonry') {
        data.ventilation.structural_infiltration += 0.35;
    }
    if (data.ventilation.suspended_wooden_floor == 'unsealed') {
        data.ventilation.structural_infiltration += 0.2;
    }
    if (data.ventilation.suspended_wooden_floor == 'sealed') {
        data.ventilation.structural_infiltration += 0.1;
    }
    if (!data.ventilation.draught_lobby) {
        data.ventilation.structural_infiltration += 0.05;
    }
    data.ventilation.structural_infiltration +=
        0.25 - (0.2 * data.ventilation.percentage_draught_proofed) / 100;
    // Structural infiltration from test
    //data.ventilation.structural_infiltration_from_test = data.ventilation.air_permeability_value / 20.0; // This is the formula used in SAP, but it is wrong the units here are "m3/h/m2 of envelope area" but should be ACH
    let m3m2Ea_to_ACH_coefficient =
        (data.fabric.total_external_area + data.fabric.total_party_wall_area) /
        data.volume; // = Envelope area / dwelling volume
    data.ventilation.structural_infiltration_from_test =
        (m3m2Ea_to_ACH_coefficient * data.ventilation.air_permeability_value) / 20.0;
    if (data.ventilation.air_permeability_test == false) {
        infiltration += data.ventilation.structural_infiltration;
    } else {
        infiltration += data.ventilation.structural_infiltration_from_test;
    }
    data.ventilation.infiltration_rate = infiltration;
    data.ventilation.EVP_air_changes = EVP_air_changes;
    let shelter_factor = 1 - 0.075 * data.ventilation.number_of_sides_sheltered;
    infiltration *= shelter_factor;
    EVP_air_changes *= shelter_factor;
    data.ventilation.infiltration_rate_incorp_shelter_factor = infiltration;
    let adjusted_infiltration = [];
    let adjusted_EVP_air_changes = [];
    data.ventilation.windfactor = [];
    data.ventilation.adjusted_infiltration = [];
    data.ventilation.adjusted_EVP_air_changes = [];
    for (var m = 0; m < 12; m++) {
        let windspeed = datasets.table_u2[data.region][m];
        let windfactor = windspeed / 4;
        adjusted_infiltration[m] = infiltration * windfactor;
        adjusted_EVP_air_changes[m] = EVP_air_changes * windfactor;
        data.ventilation.windfactor[m] = windfactor;
        data.ventilation.adjusted_infiltration[m] = adjusted_infiltration[m];
        data.ventilation.adjusted_EVP_air_changes[m] = adjusted_EVP_air_changes[m];
    }

    // (24a)m effective_air_change_rate
    // (22b)m adjusted_infiltration
    // (23b)  input.effective_air_change_rate.exhaust_air_heat_pump
    // (23c)  input.balanced_heat_recovery_efficiency
    let effective_air_change_rate = [];
    let infiltration_WK = [];
    let ventilation_WK = [];
    let ventilation_type;
    switch (data.ventilation.ventilation_type) {
        case 'NV':
        case 'IE':
        case 'PS':
            ventilation_type = 'd'; // Natural ventilation or whole house positive input ventilation from loft
            break;
        case 'DEV':
        case 'MEV':
            ventilation_type = 'c'; // Whole house extract ventilation or positive input ventilation from outside
            break;
        case 'MV':
            ventilation_type = 'b'; // Balanced mechanical ventilation without heat recovery (MV)
            break;
        case 'MVHR':
            ventilation_type = 'a'; //Balanced mechanical ventilation with heat recovery (MVHR)
            break;
        default:
            data.ventilation.ventilation_type = 'NV';
            ventilation_type = 'd';
            break;
    }

    // Calculation of infiltration and ventilation looses (SAP2012 only adds both together and call them "ventilation looses", confusing
    switch (ventilation_type) {
        case 'a':
            for (var m = 0; m < 12; m++) {
                // (24a)m = (22b)m + (23b) x (1 - (23c) / 100)
                effective_air_change_rate[m] =
                    adjusted_infiltration[m] +
                    data.ventilation.system_air_change_rate *
                        (1 - data.ventilation.balanced_heat_recovery_efficiency / 100.0);
                infiltration_WK[m] = data.volume * 0.33 * adjusted_infiltration[m];
                ventilation_WK[m] =
                    data.volume *
                    0.33 *
                    data.ventilation.system_air_change_rate *
                    (1 - data.ventilation.balanced_heat_recovery_efficiency / 100.0);
            }
            break;
        case 'b':
            for (var m = 0; m < 12; m++) {
                // (24b)m = (22b)m + (23b)
                effective_air_change_rate[m] =
                    adjusted_infiltration[m] + data.ventilation.system_air_change_rate;
                infiltration_WK[m] = data.volume * 0.33 * adjusted_infiltration[m];
                ventilation_WK[m] =
                    data.volume * 0.33 * data.ventilation.system_air_change_rate;
            }
            break;
        case 'c':
            for (var m = 0; m < 12; m++) {
                // According to SAP 2012 p. 180
                // if (22b)m < 0.5 × (23b), then (24c) = (23b); otherwise (24c) = (22b) m + 0.5 × (23b)
                // effective_air_change_rate[m] =
                /*if (adjusted_infiltration[m] < 0.5 * data.ventilation.system_air_change_rate) {
                 effective_air_change_rate[m] = data.ventilation.system_air_change_rate;
                 infiltration_WK[m] = 0;
                 ventilation_WK[m] = data.volume * 0.33 * data.ventilation.system_air_change_rate;
                 }
                 else {
                 effective_air_change_rate[m] = adjusted_infiltration[m] + (0.5 * data.ventilation.system_air_change_rate);
                 infiltration_WK[m] = data.volume * 0.33 * adjusted_infiltration[m];
                 ventilation_WK[m] = data.volume * 0.33 * 0.5 * data.ventilation.system_air_change_rate;
                 }*/

                // But this SAP calculation leads to an underestimation of heat losses from infiltration in some cases.
                // So in openBEM for this case we always calculate effective_air_change_rate[m] as (24c) = (22b) m + 0.5 × (23b)
                // See https://github.com/emoncms/MyHomeEnergyPlanner/issues/407
                effective_air_change_rate[m] =
                    adjusted_infiltration[m] +
                    0.5 * data.ventilation.system_air_change_rate;
                infiltration_WK[m] = data.volume * 0.33 * adjusted_infiltration[m];
                ventilation_WK[m] =
                    data.volume * 0.33 * 0.5 * data.ventilation.system_air_change_rate;
            }
            break;
        case 'd':
            for (var m = 0; m < 12; m++) {
                // According to SAP 2012 p. 180
                // if (22b)m ≥ 1, then (24d)m = (22b)m otherwise (24d)m = 0.5 + [(22b)m2 × 0.5]
                /*if ((adjusted_infiltration[m] + adjusted_EVP_air_changes[m]) >= 1) {
                 effective_air_change_rate[m] = adjusted_infiltration[m] + adjusted_EVP_air_changes[m];
                 infiltration_WK[m] = data.volume * 0.33 * adjusted_infiltration[m];
                 ventilation_WK[m] = data.volume * 0.33 * adjusted_EVP_air_changes[m];
                 }
                 else {
                 effective_air_change_rate[m] = 0.5 + Math.pow(adjusted_infiltration[m], 2) * 0.5;
                 infiltration_WK[m] = data.volume * 0.33 * (0.5 + Math.pow(adjusted_infiltration[m], 2) * 0.5 + adjusted_infiltration[m] * adjusted_EVP_air_changes[m]);
                 ventilation_WK[m] = data.volume * 0.33 * Math.pow(adjusted_EVP_air_changes[m], 2) * 0.5;
                 }*/
                // But this SAP calculation leads to an underestimation of heat losses from infiltration in some cases.
                // So in openBEM for this case we always calculate effective_air_change_rate[m] as (24d)m = 0.5 + [(22b)m2 × 0.5]
                // See https://github.com/emoncms/MyHomeEnergyPlanner/issues/407
                effective_air_change_rate[m] =
                    adjusted_infiltration[m] + adjusted_EVP_air_changes[m];
                infiltration_WK[m] = data.volume * 0.33 * adjusted_infiltration[m];
                ventilation_WK[m] = data.volume * 0.33 * adjusted_EVP_air_changes[m];
            }
            break;
    }

    let sum_infiltration = 0;
    let sum_ventilation = 0;
    let SAP_ventilation_WK = [];
    let HTC = [];
    for (var m = 0; m < 12; m++) {
        sum_infiltration += infiltration_WK[m];
        sum_ventilation += ventilation_WK[m];
        SAP_ventilation_WK[m] = infiltration_WK[m] + ventilation_WK[m];
        HTC[m] = data.fabric_total_heat_loss_WK + SAP_ventilation_WK[m];
    }

    data.ventilation.average_WK = (sum_infiltration + sum_ventilation) / 12.0;
    data.ventilation.average_infiltration_WK = sum_infiltration / 12.0;
    data.ventilation.average_ventilation_WK = sum_ventilation / 12.0;
    data.ventilation.effective_air_change_rate = effective_air_change_rate;
    data.ventilation.infiltration_WK = infiltration_WK;
    data.ventilation.ventilation_WK = ventilation_WK;
    data.losses_WK.ventilation = ventilation_WK;
    data.losses_WK.infiltration = infiltration_WK;
    data.ventilation.SAP_ventilation_WK = SAP_ventilation_WK;
    data.totalWK_monthly = HTC;
    return data;
}
