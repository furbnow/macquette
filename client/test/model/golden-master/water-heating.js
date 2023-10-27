/* eslint-disable */
import { datasets } from '../reference-datasets';

/*---------------------------------------------------------------------------------------------
 // water_heating
 // Calculates:
 //   - Gains from: primary circuit loses, storage loses, combi loses and distribution loses
 //   - Energy requirements
 //
 // Inputs from user:
 //      - data.water_heating.override_annual_energy_content
 //	- data.water_heating.annual_energy_content
 //	- data.water_heating.low_water_use_design
 //	- data.water_heating.hot_water_control_type
 //	- data.water_heating.pipework_insulation
 //	- data.water_heating.storage_type
 //	- data.water_heating.contains_dedicated_solar_storage_or_WWHRSs
 //	- data.water_heating.solar_water_heating
 //	- data.water_heating.hot_water_store_in_dwelling
 //	- data.water_heating.community_heating
 //
 // Inputs from other modules:
 //	- data.heating_systems
 //	- data.SHW.Qs_monthly
 //
 // Global Outputs:
 //	- data.gains_W["waterheating"]
 //      - data.energy_requirements.waterheating
 //
 // Module Variables:
 //	- data.water_heating.Vd_average
 //	- data.water_heating.override_annual_energy_content 	// Calculated by the module when override_annual_energy_content is set to false
 //	- data.water_heating.pipework_insulated_fraction
 //	- data.water_heating.monthly_energy_content
 //	- data.water_heating.distribution_loss
 //	- data.water_heating.energy_lost_from_water_storage
 //	- data.water_heating.monthly_storage_loss
 //	- data.water_heating.primary_circuit_loss
 //	- data.water_heating.combi_loss
 //	- data.water_heating.total_heat_required
 //	- data.water_heating.hot_water_heater_output
 //	- data.water_heating.annual_waterheating_demand
 //	- data.water_heating.heat_gains_from_water_heating
 //
 // Datasets:
 //      - datasets.table_1c
 //	- datasets.table_1a
 //
 //---------------------------------------------------------------------------------------------*/
export function legacyWaterHeating(data) {
    if (data.water_heating == undefined) {
        data.water_heating = {};
    }
    if (data.water_heating.combi_loss == undefined) {
        data.water_heating.combi_loss = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    if (data.water_heating.solar_water_heating == undefined) {
        data.water_heating.solar_water_heating = false;
    }
    if (data.water_heating.hot_water_control_type == undefined) {
        data.water_heating.hot_water_control_type = 'no_cylinder_thermostat';
    }
    if (data.water_heating.pipework_insulation == undefined) {
        data.water_heating.pipework_insulation = 'Fully insulated primary pipework';
    }
    if (data.water_heating.Vc == undefined) {
        data.water_heating.Vc = 0;
    }
    if (data.water_heating.water_usage == undefined) {
        data.water_heating.water_usage = [];
    }
    if (data.water_heating.contains_dedicated_solar_storage_or_WWHRS == undefined) {
        data.water_heating.contains_dedicated_solar_storage_or_WWHRS = 0;
    }
    data.water_heating.Vd_average = 25 * data.occupancy + 36;
    if (data.water_heating.low_water_use_design) {
        data.water_heating.Vd_average *= 0.95;
    }
    if (data.heating_systems == undefined) {
        data.heating_systems = [];
    }
    let Vd_m = [];
    let monthly_energy_content = [];
    let total_distribution_loss = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let energy_lost_from_water_storage = 0;
    let total_primary_circuit_loss = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let total_combi_loss = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let total_heat_required = [];
    let hot_water_heater_output = [];
    let heat_gains_from_water_heating = [];

    //////////////////////
    //  Energy content  //
    //////////////////////
    if (data.water_heating.override_annual_energy_content == 1) {
        // We don't need to calculate data.water_heating.annual_energy_content as it has been inputed in waterheating.html
        for (var m = 0; m < 12; m++) {
            monthly_energy_content[m] =
                (datasets.table_1c[m] * data.water_heating.annual_energy_content) / 12;
        }
    } else {
        data.water_heating.annual_energy_content = 0;
        for (var m = 0; m < 12; m++) {
            Vd_m[m] = datasets.table_1c[m] * data.water_heating.Vd_average;
            monthly_energy_content[m] =
                (4.18 * Vd_m[m] * datasets.table_1a[m] * datasets.table_1d[m]) / 3600;
            data.water_heating.annual_energy_content += monthly_energy_content[m];
        }
    }

    //////////////////////////////////////
    // Total heat required              //
    // ///////////////////////////////////
    total_heat_required = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Total heat required due to water heating systems: Calculate losses for distribution, primary circuit and combi for every heating system if not instantaneous heating at point of use
    total_distribution_loss = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    total_primary_circuit_loss = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    total_combi_loss = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    data.heating_systems.forEach(function (system) {
        if (
            (system.provides == 'water' || system.provides == 'heating_and_water') &&
            system.fraction_water_heating > 0
        ) {
            if (system.instantaneous_water_heating) {
                for (var m = 0; m < 12; m++) {
                    total_heat_required[m] +=
                        0.85 * system.fraction_water_heating * monthly_energy_content[m];
                }
            } else {
                let distribution_loss = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                let primary_circuit_loss = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                let combi_loss = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

                for (var m = 0; m < 12; m++) {
                    // DISTRIBUTION LOSSES
                    distribution_loss[m] =
                        0.15 * system.fraction_water_heating * monthly_energy_content[m];

                    // PRIMARY CIRCUIT LOSSES - SAP2012, table 3, p.199
                    if (system.primary_circuit_loss == 'Yes') {
                        let hours_per_day = 0;
                        if (m >= 5 && m <= 8) {
                            hours_per_day = 3;
                        } else {
                            if (
                                data.water_heating.hot_water_control_type ==
                                'no_cylinder_thermostat'
                            ) {
                                hours_per_day = 11;
                            }
                            if (
                                data.water_heating.hot_water_control_type ==
                                'Cylinder thermostat, water heating not separately timed'
                            ) {
                                hours_per_day = 5;
                            }
                            if (
                                data.water_heating.hot_water_control_type ==
                                'Cylinder thermostat, water heating separately timed'
                            ) {
                                hours_per_day = 3;
                            }
                            /*if (data.water_heating.community_heating)
                             hours_per_day = 3;*/
                        }

                        if (
                            data.water_heating.pipework_insulation ==
                            'Uninsulated primary pipework'
                        ) {
                            data.water_heating.pipework_insulated_fraction = 0;
                        }
                        if (
                            data.water_heating.pipework_insulation ==
                            'First 1m from cylinder insulated'
                        ) {
                            data.water_heating.pipework_insulated_fraction = 0.1;
                        }
                        if (
                            data.water_heating.pipework_insulation ==
                            'All accesible piperwok insulated'
                        ) {
                            data.water_heating.pipework_insulated_fraction = 0.3;
                        }
                        if (
                            data.water_heating.pipework_insulation ==
                            'Fully insulated primary pipework'
                        ) {
                            data.water_heating.pipework_insulated_fraction = 1.0;
                        }

                        /*if (data.water_heating.community_heating)
                         data.water_heating.pipework_insulated_fraction = 1.0;*/

                        primary_circuit_loss[m] =
                            datasets.table_1a[m] *
                            14 *
                            ((0.0091 * data.water_heating.pipework_insulated_fraction +
                                0.0245 *
                                    (1 -
                                        data.water_heating.pipework_insulated_fraction)) *
                                hours_per_day +
                                0.0263);

                        if (data.water_heating.solar_water_heating) {
                            primary_circuit_loss[m] *= datasets.table_h4[m];
                        }
                    }

                    // COMBI LOSS-  for each month from Table 3a, 3b or 3c (enter “0” if not a combi boiler)
                    if (system.combi_loss != '0') {
                        if (Vd_m[m] < 100) {
                            var fu = Vd_m[m] / 100;
                        } else {
                            var fu = 1;
                        }
                        switch (system.combi_loss) {
                            case 'Instantaneous, without keep hot-facility':
                                combi_loss[m] = (600 * fu * datasets.table_1a[m]) / 365;
                                break;
                            case 'Instantaneous, with keep-hot facility controlled by time clock':
                                combi_loss[m] = (600 * datasets.table_1a[m]) / 365;
                                break;
                            case 'Instantaneous, with keep-hot facility not controlled by time clock':
                                combi_loss[m] = (900 * datasets.table_1a[m]) / 365;
                                break;
                            case 'Storage combi boiler >= 55 litres':
                                combi_loss[m] = 0;
                                break;
                            case 'Storage combi boiler < 55 litres':
                                combi_loss[m] =
                                    ((600 - (data.water_heating.Vc - 15) * 15) *
                                        fu *
                                        datasets.table_1a[m]) /
                                    365;
                                break;
                        }
                    }

                    // Total heat required due to water heating system losses
                    total_heat_required[m] +=
                        0.85 * system.fraction_water_heating * monthly_energy_content[m] +
                        distribution_loss[m] +
                        primary_circuit_loss[m] +
                        combi_loss[m];
                    total_distribution_loss[m] += distribution_loss[m];
                    total_primary_circuit_loss[m] += primary_circuit_loss[m];
                    total_combi_loss[m] += combi_loss[m];
                }
                //----------------------------------------------------------------------------------------
            }
        }
    });

    // Storage losses are calculated if there is a Storage added
    let monthly_storage_loss = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (data.water_heating.storage_type != undefined) {
        //Daily loss
        if (data.water_heating.storage_type.declared_loss_factor_known) {
            energy_lost_from_water_storage =
                data.water_heating.storage_type.manufacturer_loss_factor *
                data.water_heating.storage_type.temperature_factor_a;
        } else {
            energy_lost_from_water_storage =
                data.water_heating.storage_type.storage_volume *
                data.water_heating.storage_type.loss_factor_b *
                data.water_heating.storage_type.volume_factor_b *
                data.water_heating.storage_type.temperature_factor_b;
        }
        // Monthly
        for (m = 0; m < 12; m++) {
            monthly_storage_loss[m] =
                datasets.table_1a[m] * energy_lost_from_water_storage;
            if (
                data.water_heating.contains_dedicated_solar_storage_or_WWHRS > 0 &&
                data.water_heating.storage_type.storage_volume > 0
            ) {
                monthly_storage_loss[m] =
                    monthly_storage_loss[m] *
                    ((1.0 * data.water_heating.storage_type.storage_volume -
                        data.water_heating.contains_dedicated_solar_storage_or_WWHRS) /
                        data.water_heating.storage_type.storage_volume);
            }
        }
        // Add the loss to the total_heat_required
        for (m = 0; m < 12; m++) {
            total_heat_required[m] += monthly_storage_loss[m];
        }
    }

    data.water_heating.monthly_energy_content = monthly_energy_content;
    data.water_heating.distribution_loss = total_distribution_loss;
    data.water_heating.energy_lost_from_water_storage = energy_lost_from_water_storage;
    data.water_heating.monthly_storage_loss = monthly_storage_loss;
    data.water_heating.primary_circuit_loss = total_primary_circuit_loss;
    data.water_heating.combi_loss = total_combi_loss;
    data.water_heating.total_heat_required = total_heat_required;

    //////////////////////////////////////
    // WH energy requirements and gains //
    //////////////////////////////////////
    let waterheating_gains = [];
    let annual_waterheating_demand = 0;
    for (var m = 0; m < 12; m++) {
        if (
            data.water_heating.solar_water_heating &&
            data.SHW != undefined &&
            data.SHW.Qs_monthly != undefined
        ) {
            hot_water_heater_output[m] = total_heat_required[m] + data.SHW.Qs_monthly[m]; // Beware that data.SHW.Qs_monthly[m] is negative, that makes sense!!!
        } else {
            hot_water_heater_output[m] = total_heat_required[m];
        }

        if (hot_water_heater_output[m] < 0) {
            hot_water_heater_output[m] = 0;
        }
        annual_waterheating_demand += hot_water_heater_output[m];
        if (
            data.water_heating.hot_water_store_in_dwelling ||
            data.water_heating.community_heating
        ) {
            heat_gains_from_water_heating[m] =
                0.25 *
                    (0.85 * monthly_energy_content[m] +
                        data.water_heating.combi_loss[m]) +
                0.8 *
                    (data.water_heating.distribution_loss[m] +
                        data.water_heating.monthly_storage_loss[m] +
                        data.water_heating.primary_circuit_loss[m]);
        } else {
            heat_gains_from_water_heating[m] =
                0.25 *
                    (0.85 * monthly_energy_content[m] +
                        data.water_heating.combi_loss[m]) +
                0.8 *
                    (data.water_heating.distribution_loss[m] +
                        data.water_heating.primary_circuit_loss[m]);
        }

        // Table 5 typical gains
        waterheating_gains[m] =
            (1000 * heat_gains_from_water_heating[m]) / (datasets.table_1a[m] * 24);
    }

    data.water_heating.hot_water_heater_output = hot_water_heater_output;
    data.water_heating.annual_waterheating_demand = annual_waterheating_demand;
    data.water_heating.heat_gains_from_water_heating = heat_gains_from_water_heating;
    data.gains_W['waterheating'] = waterheating_gains;
    data.energy_requirements.waterheating = {
        name: 'Water Heating',
        quantity: annual_waterheating_demand,
        monthly: hot_water_heater_output,
    };

    return data;
}
