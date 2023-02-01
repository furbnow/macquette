/* eslint-disable */

import { scenarioSchema } from '../data-schemas/scenario';
import { datasets } from './datasets/legacy'
import { setBlankLegacyOutputs, setDefaultLegacyInputs } from './modules/legacy-initialisation';
import { emulateJsonRoundTrip } from '../helpers/emulate-json-round-trip';
import { CombinedModules } from './combined-modules';

let g, m, x, z, fuel; // Variables used in for-loops

/*

 An open source building energy model based on SAP.

 Studying the SAP model we see that the calculations can be broken down into sub
 calculation modules and that it could be possible to create a flexible model where
 you can include or exclude certain parts depending on the granularity or adherence
 to SAP that you would like.

 Principles

 - All variables that are accessed in the ui need to be available via the data object.

 - Variables written to from one module and accessed from another need to be in the
 global name space.

 - Variables used internally by a module that are also accessed in the ui should be
 defined within the module namespace.

 - Variables used internally by a module that are not accessed by the ui should be
 defined as local variables within the module's calc function.

 - variable naming: this_is_a_variable. _ between words. Abbreviations can be in capitals
 otherwise lower case.

 - if the module has a primary data object i.e floors call the module by the data object
 name.

 - calc functions should be divided by task.

 - Version of the model is noted as major.minor -> changes of the major value are due to
 a change of inputs to the model. Changes of the minor values are due to changes only in the code.
 */

let version = 10.01;

let calc = {data: {}};

/******************************************************************
 * RUN
 *
 * Run all the modules in the right order
 *
 ******************************************************************/
calc.run = function (datain) {
    if (datain === undefined) {
        calc.data = {}
    } else {
        calc.data = datain;
    }

    const combinedModulesR = CombinedModules.fromLegacy(datain);
    if (combinedModulesR.isErr()) {
        console.error(combinedModulesR.unwrapErr());
        calc.data.model = combinedModulesR;
        return calc.data;
    }

    const combinedModules = combinedModulesR.unwrap();
    setDefaultLegacyInputs(calc.data)
    setBlankLegacyOutputs(calc.data)
    combinedModules.mutateLegacyData(calc.data)

    calc.currentenergy(calc.data);
    calc.metabolic_losses_fans_and_pumps_gains(calc.data);
    calc.temperature(calc.data);
    calc.fans_and_pumps_and_combi_keep_hot(calc.data);
    calc.gains_summary(calc.data);
    calc.space_heating(calc.data);
    calc.heating_systems(calc.data);
    calc.fuel_requirements(calc.data);
    calc.fabric_energy_efficiency(calc.data);
    calc.SAP(calc.data);
    calc.data.totalWK = calc.data.fabric_total_heat_loss_WK + calc.data.ventilation.average_WK;
    calc.data.primary_energy_use_m2 = calc.data.primary_energy_use / calc.data.TFA;
    calc.data.kgco2perm2 = calc.data.annualco2 / calc.data.TFA;
    calc.data.kwhdpp = (calc.data.energy_use / 365.0) / calc.data.occupancy;
    calc.data.primarykwhdpp = (calc.data.primary_energy_use / 365.0) / calc.data.occupancy;
    return calc.data;
};

/*---------------------------------------------------------------------------------------------
 // TEMPERATURE
 //
 // Inputs from user:
 //      - data.temperature.target
 //      - data.temperature.living_area
 //
 // Inputs from other modules:
 //      - data.TFA
 //      - data.TMP
 //      - data.losses_WK
 //      - data.gains_W
 //      - data.altitude
 //      - data.region
 //	- data.heating_systems
 //	- data.temperature.hours_off
 //
 // Global Outputs:
 //      - data.internal_temperature
 //      - data.external_temperature
 //      - data.HLP
 //	- data.mean_internal_temperature.u_factor_living_area
 //      - data.mean_internal_temperature.m_i_t_living_area
 //      - data.mean_internal_temperature.t_heating_periods_rest_of_dwelling
 //      - data.mean_internal_temperature.u_factor_rest_of_dwelling
 //      - data.mean_internal_temperature.m_i_t_rest_of_dwelling
 //      - data.mean_internal_temperature.fLA
 //      - data.mean_internal_temperature.m_i_t_whole_dwelling
 //      - data.temperature.temperature_adjustment
 //	- data.mean_internal_temperature.m_i_t_whole_dwelling_adjusted
 //
 //
 // Module Variables:
 //	- data.temperature.responsiveness
 //
 // Datasets:
 //      - datasets.table_u1
 //
 // Uses external function:
 //      - calc_utilisation_factor
 //	- calc_MeanInternalTemperature
 //	- calc_Th2
 //
 //---------------------------------------------------------------------------------------------*/
calc.temperature = function (data) {
    if (data.temperature == undefined) {
        data.temperature = {};
    }
    if (data.temperature.living_area == undefined) {
        data.temperature.living_area = data.TFA;
    }
    if (data.temperature.target == undefined) {
        data.temperature.target = 21;
    }
    if (data.temperature.temperature_adjustment == undefined) {
        data.temperature.temperature_adjustment = 0;
    }
    if (data.temperature.hours_off == undefined) {
        data.temperature.hours_off = {weekday: [7, 8], weekend: [8]};
    }

    // Get Main heating systems
    let mainHSs = {}; // It will take the form of: mainHSs = {mainHS1: systemObject, mainHS2: systemObject}
    data.heating_systems.forEach(function (system) {
        if ((system.provides == 'heating' || system.provides == 'heating_and_water') && system.fraction_space > 0) {
            switch (system.main_space_heating_system) {
                case 'mainHS1':
                    mainHSs.mainHS1 = system;
                    break;
                case 'mainHS2_whole_house':
                    mainHSs.mainHS2 = system;
                    mainHSs.mainHS2.whole_house = true;
                    break;
                case 'mainHS2_part_of_the_house':
                    mainHSs.mainHS2 = system;
                    mainHSs.mainHS2.whole_house = false;
                    break;
            }
        }
    });

    // In case of two main heating systems, calculate their fraction of "main heating" (different than fraction of "space heating")
    if (mainHSs.mainHS1 != undefined && mainHSs.mainHS2 != undefined) {
        var fraction_MHS1 = mainHSs.mainHS1.fraction_space / (mainHSs.mainHS1.fraction_space + mainHSs.mainHS2.fraction_space);
        var fraction_MHS2 = mainHSs.mainHS2.fraction_space / (mainHSs.mainHS1.fraction_space + mainHSs.mainHS2.fraction_space);
    }

    // Calculate responsiveness - SAP21012, table 9b, p. 220
    data.temperature.responsiveness = 1; // In case no 1st Main heating system has been selected
    // if there is only one main system
    if (mainHSs.mainHS1 != undefined && mainHSs.mainHS2 == undefined) {
        data.temperature.responsiveness = mainHSs.mainHS1.responsiveness;
    } else if (mainHSs.mainHS1 != undefined && mainHSs.mainHS2 != undefined) {
        // if there are two
        data.temperature.responsiveness = fraction_MHS1 * mainHSs.mainHS1.responsiveness + fraction_MHS2 * mainHSs.mainHS2.responsiveness;
    }

    // Other prepration for the formula
    let R = data.temperature.responsiveness;
    let Th = data.temperature.target;
    let Th_monthly = [Th, Th, Th, Th, Th, Th, Th, Th, Th, Th, Th, Th];
    let TMP = data.TMP; // data.TMP;

    let fLA = data.temperature.living_area / data.TFA;
    if (isNaN(fLA)) {
        fLA = 0;
    }

    let H = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let HLP = [];
    let G = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (m = 0; m < 12; m++) {
        for (z in data.losses_WK) {
            H[m] += data.losses_WK[z][m];
            HLP[m] = H[m] / data.TFA;
        }

        for (z in data.gains_W) {
            G[m] += data.gains_W[z][m];
        }
    }

    let Te = [];
    for (var m = 0; m < 12; m++) {
        //Te[m] = datasets.table_u1[data.region][m] - (0.3 * data.altitude / 50);
        Te[m] = datasets.table_u1[data.region][m];
    }

    //----------------------------------------------------------------------------------------------------------------
    // 7. Mean internal temperature (heating season)
    //----------------------------------------------------------------------------------------------------------------

    // Bring calculation of (96)m forward as its used in section 7.
    // Monthly average external temperature from Table U1
    // for (var i=1; i<13; i++) data['96-'+i] = table_u1[i.region][i-1]-(0.3 * i.altitude / 50);

    // See utilisationfactor.js for calculation
    // Calculation is described on page 159 of SAP document
    // Would be interesting to understand how utilisation factor equation
    // can be derived

    let utilisation_factor_A = [];
    for (var m = 0; m < 12; m++) {
        utilisation_factor_A[m] = calc_utilisation_factor(TMP, HLP[m], H[m], Th, Te[m], G[m]);
    }

    // Table 9c: Heating requirement

    // Living area
    let Ti_livingarea = calc_MeanInternalTemperature(Th_monthly, data.temperature.hours_off, TMP, HLP, H, Te, G, R);


    // rest of dwelling - SAP2012, table 9, p.221
    let Th2 = [];
    let Ti_restdwelling = [];
    if (mainHSs.mainHS1 != undefined) {
        if (mainHSs.mainHS2 == undefined || mainHSs.mainHS2.whole_house == true) {
            Th2 = calc_Th2(mainHSs.mainHS1.heating_controls, Th, HLP);
            Ti_restdwelling = calc_MeanInternalTemperature(Th2, data.temperature.hours_off, TMP, HLP, H, Te, G, R);
        }
        if (mainHSs.mainHS2 != undefined && mainHSs.mainHS2.whole_house == false) { // The 2nd main heating system heats a different part of the house
            if (mainHSs.mainHS2.fraction_space > (1 - fLA)) {
                Th2 = calc_Th2(mainHSs.mainHS2.heating_controls, Th, HLP);
                Ti_restdwelling = calc_MeanInternalTemperature(Th2, data.temperature.hours_off, TMP, HLP, H, Te, G, R);
            } else {
                Th2 = calc_Th2(mainHSs.mainHS1.heating_controls, Th, HLP);
                let Ti_restdwelling_S1 = calc_MeanInternalTemperature(Th2, data.temperature.hours_off, TMP, HLP, H, Te, G, R);

                Th2 = calc_Th2(mainHSs.mainHS2.heating_controls, Th, HLP);
                let Ti_restdwelling_S2 = calc_MeanInternalTemperature(Th2, data.temperature.hours_off, TMP, HLP, H, Te, G, R);

                for (var m = 0; m < 12; m++) {
                    let T1 = Ti_restdwelling_S1[m] * (fraction_MHS1 - fLA) / (1 - fLA);
                    let T2 = Ti_restdwelling_S2[m] * (fraction_MHS1) / (1 - fLA);
                    Ti_restdwelling[m] = (T1 + T2) / 2;
                }
            }
        }
    }
    if (Ti_restdwelling.length == 0) {
        Ti_restdwelling = Ti_livingarea;
    }

    let utilisation_factor_B = [];
    for (var m = 0; m < 12; m++) {
        let Ti = Th2[m];
        let tmpHLP = HLP[m];
        if (tmpHLP > 6.0) {
            tmpHLP = 6.0;
        }
        // TMP,HLP,H,Ti,Te,G
        utilisation_factor_B[m] = calc_utilisation_factor(TMP, tmpHLP, H[m], Ti, Te[m], G[m]);
    }

    data.internal_temperature = [];
    for (var m = 0; m < 12; m++) {
        data.internal_temperature[m] = (fLA * Ti_livingarea[m]) + (1 - fLA) * Ti_restdwelling[m];
    }

    data.HLP = HLP;
    data.mean_internal_temperature.u_factor_living_area = utilisation_factor_A;
    data.mean_internal_temperature.m_i_t_living_area = Ti_livingarea;
    data.mean_internal_temperature.t_heating_periods_rest_of_dwelling = Th2;
    data.mean_internal_temperature.u_factor_rest_of_dwelling = utilisation_factor_B;
    data.mean_internal_temperature.m_i_t_rest_of_dwelling = Ti_restdwelling;
    data.mean_internal_temperature.fLA = fLA;
    data.mean_internal_temperature.m_i_t_whole_dwelling = emulateJsonRoundTrip(data.internal_temperature);
    data.external_temperature = Te;

    // Temperature adjustment
    // if there is only one main system
    if (mainHSs.mainHS1 != undefined && mainHSs.mainHS2 == undefined) {
        data.temperature.temperature_adjustment = mainHSs.mainHS1.temperature_adjustment;
    } else if (mainHSs.mainHS1 != undefined && mainHSs.mainHS2 != undefined) {
        // if there are two
        if (mainHSs.mainHS2.whole_house == true) {
            data.temperature.temperature_adjustment = mainHSs.mainHS1.temperature_adjustment;
        } else {
            data.temperature.temperature_adjustment = mainHSs.mainHS1.fraction_space * mainHSs.mainHS1.temperature_adjustment + mainHSs.mainHS2.fraction_space * mainHSs.mainHS2.temperature_adjustment;
        }
    }

    for (var m = 0; m < 12; m++) {
        data.internal_temperature[m] = data.internal_temperature[m] + data.temperature.temperature_adjustment;
    }
    data.mean_internal_temperature.m_i_t_whole_dwelling_adjusted = data.internal_temperature;
    return data;
};

/*---------------------------------------------------------------------------------------------
 // SPACE HEATING AND COOLING
 // Calculates space heating and cooling demand.
 //
 // Inputs from user:
 //      - data.space_heating.use_utilfactor_forgains
 //	- data.space_heating.heating_off_summer
 //
 // Inputs from other modules:
 //      - data.internal_temperature
 //	- data.external_temperature
 //	- data.losses_WK
 //	- data.gains_W
 //	- data.TFA
 //	- data.TMP
 //
 // Global Outputs:
 //	- data.annual_useful_gains_kWh_m2
 //	- data.annual_losses_kWh_m2
 //	- data.space_heating_demand_m2
 //	- data.energy_requirements.space_heating
 //	- data.energy_requirements.space_cooling
 //
 // Module Variables:
 //	- data.space_heating.delta_T
 //	- data.space_heating.total_losses
 //	- data.space_heating.total_gains
 //	- data.space_heating.utilisation_factor
 //	- data.space_heating.useful_gains
 //	- data.space_heating.heat_demand
 //	- data.space_heating.cooling_demand
 //	- data.space_heating.heat_demand_kwh
 //	- data.space_heating.cooling_demand_kwh
 //	- data.space_heating.annual_heating_demand
 //	- data.space_heating.annual_cooling_demand
 //	- data.space_heating.annual_heating_demand_m2
 //	- data.space_heating.annual_cooling_demand_m2
 //
 // Datasets:
 //      - datasets.table_1a
 //
 // Uses external function:
 //      - calc_utilisation_factor
 //
 //------------------------------------------------------------------------------------------*/

calc.space_heating = function (data) {
    if (data.space_heating == undefined) {
        data.space_heating = {};
    }
    if (data.space_heating.use_utilfactor_forgains == undefined) {
        data.space_heating.use_utilfactor_forgains = true;
    }
    if (data.space_heating.heating_off_summer == undefined) {
        data.space_heating.heating_off_summer = true;
    }
    // These might all need to be defined within the space_heating namespace to be accessible in the ui.
    let delta_T = [];
    let total_losses = [];
    let total_gains = [];
    let utilisation_factor = [];
    let useful_gains = [];
    let annual_useful_gains_kWh_m2 = {'Internal': 0, 'Solar': 0}; //  Units: kwh/m2/year
    let annual_losses_kWh_m2 = {};
    let heat_demand = [];
    let cooling_demand = [];
    let heat_demand_kwh = [];
    let cooling_demand_kwh = [];
    let annual_heating_demand = 0;
    let annual_cooling_demand = 0;

    for (m = 0; m < 12; m++) {
        // DeltaT (Difference between Internal and External temperature)
        delta_T[m] = data.internal_temperature[m] - data.external_temperature[m];
        // Monthly heat loss totals
        let H = 0; // heat transfer coefficient
        for (z in data.losses_WK) {
            H += data.losses_WK[z][m];
        }
        total_losses[m] = H * delta_T[m];
        // SAP2012, p.220
        if (data.space_heating.heating_off_summer == 1 && m >= 5 && m <= 8) {
            total_losses[m] = 0;
        }
        // Monthly heat gains total
        let G = 0;
        for (z in data.gains_W) {
            G += data.gains_W[z][m];
        }
        total_gains[m] = G;
        // SAP2012, p.220
        if (data.space_heating.heating_off_summer == 1 && m >= 5 && m <= 8) {
            total_gains[m] = 0;
        }
        // Calculate overall utilisation factor for gains
        let HLP = H / data.TFA;
        utilisation_factor[m] = calc_utilisation_factor(data.TMP, HLP, H, data.internal_temperature[m], data.external_temperature[m], total_gains[m]);
        // Apply utilisation factor if chosen:
        if (data.space_heating.use_utilfactor_forgains) {
            useful_gains[m] = total_gains[m] * utilisation_factor[m];
        } else {
            useful_gains[m] = total_gains[m];
        }

        //      Space heating demand is simply the difference between the heat loss rate
        //      for our target internal temperature and the gains.
        heat_demand[m] = total_losses[m] - useful_gains[m];
        cooling_demand[m] = 0;
        // Case of cooling:
        if (heat_demand[m] < 0) {
            cooling_demand[m] = useful_gains[m] - total_losses[m];
            heat_demand[m] = 0;
        }


        // SAP2012, p.220
        if (data.space_heating.heating_off_summer == 1 && m >= 5 && m <= 8) {
            heat_demand[m] = 0;
        }
        heat_demand_kwh[m] = 0.024 * heat_demand[m] * datasets.table_1a[m];
        cooling_demand_kwh[m] = 0.024 * cooling_demand[m] * datasets.table_1a[m];
        annual_heating_demand += heat_demand_kwh[m];
        annual_cooling_demand += cooling_demand_kwh[m];

        ///////////////////////////////////////////////////////
        //Annual useful gains and losses. Units: kwh/m2/year //
        ///////////////////////////////////////////////////////
        if (data.space_heating.heating_off_summer == 0 || (m < 5 || m > 8)) {
            let gains_source = '';
            for (z in data.gains_W) {
                if (z === 'Appliances' || z === 'Lighting' || z === 'Cooking' || z === 'waterheating' || z === 'fans_and_pumps' || z === 'metabolic' || z === 'losses') {
                    gains_source = 'Internal';
                }
                if (z === 'solar') {
                    gains_source = 'Solar';
                }
                // Apply utilisation factor if chosen:
                if (data.space_heating.use_utilfactor_forgains) {
                    annual_useful_gains_kWh_m2[gains_source] += (utilisation_factor[m] * data.gains_W[z][m] * 0.024 * datasets.table_1a[m]) / data.TFA;
                } else {
                    annual_useful_gains_kWh_m2[gains_source] += data.gains_W[z][m] * 0.024 / data.TFA;
                }
            }
            // Annual losses. Units: kwh/m2/year
            for (z in data.losses_WK) {
                if (annual_losses_kWh_m2[z] == undefined) {
                    annual_losses_kWh_m2[z] = 0;
                }
                annual_losses_kWh_m2[z] += (data.losses_WK[z][m] * 0.024 * delta_T[m] * datasets.table_1a[m]) / data.TFA;
            }
        }
    }

    data.space_heating.delta_T = delta_T;
    data.space_heating.total_losses = total_losses;
    data.space_heating.total_gains = total_gains;
    data.space_heating.utilisation_factor = utilisation_factor;
    data.space_heating.useful_gains = useful_gains;
    data.annual_useful_gains_kWh_m2 = annual_useful_gains_kWh_m2;
    data.annual_losses_kWh_m2 = annual_losses_kWh_m2;
    data.space_heating.heat_demand = heat_demand;
    data.space_heating.cooling_demand = cooling_demand;
    data.space_heating.heat_demand_kwh = heat_demand_kwh;
    data.space_heating.cooling_demand_kwh = cooling_demand_kwh;
    data.space_heating.annual_heating_demand = annual_heating_demand;
    data.space_heating.annual_cooling_demand = annual_cooling_demand;
    data.space_heating.annual_heating_demand_m2 = annual_heating_demand / data.TFA;
    data.space_heating.annual_cooling_demand_m2 = annual_cooling_demand / data.TFA;
    if (annual_heating_demand > 0) {
        data.energy_requirements.space_heating = {name: 'Space Heating', quantity: annual_heating_demand, monthly: heat_demand_kwh};
    }
    data.space_heating_demand_m2 = (annual_heating_demand + annual_cooling_demand) / data.TFA;
    return data;
};

/*---------------------------------------------------------------------------------------------
 // HEATING SYSTEMS
 //
 // Calculates fuel requirements for water heating
 //  and space heating
 //
 // Inputs from user:
 //      - data.heating_systems
 //
 // Inputs from other modules:
 //      - data.energy_requirements.waterheating
 //	- data.energy_requirements.space_heating
 //
 // Global Outputs:
 //	- data.fuel_requirements.waterheating
 //	- data.fuel_requirements.space_heating
 //
 //---------------------------------------------------------------------------------------------*/

calc.heating_systems = function (data) {
    if (data.heating_systems == undefined) {
        data.heating_systems = [];
    }

    //////////////////////////////////////
    // Fuel requirements  Water Heating //
    //////////////////////////////////////
    var f_requirements = [];
    data.heating_systems.forEach(function (system) {
        if (system.provides == 'water' || system.provides == 'heating_and_water') {
            // Calculate system efficiency
            switch (system.provides) {
                case 'water':
                    system.efficiency = system.summer_efficiency / 100;
                    break;
                case 'heating_and_water':
                    var Q_water = system.fraction_water_heating * data.energy_requirements.waterheating.quantity;
                    if (data.energy_requirements.space_heating == undefined) {
                        data.energy_requirements.space_heating = {quantity: 0};
                    }
                    var Q_space = system.fraction_space * data.energy_requirements.space_heating.quantity;
                    var n_winter = system.summer_efficiency / 100;
                    var n_summer = system.winter_efficiency / 100;
                    system.efficiency = (Q_water + Q_space) / ((Q_space / n_winter) + (Q_water / n_summer));
                    break;
            }

            // Sort them by 'fuel'
            if (f_requirements[system.fuel] == undefined) {
                f_requirements[system.fuel] = {demand: 0, fraction: 0, fuel: system.fuel, fuel_input: 0};
            }
            let demand = system.fraction_water_heating * data.energy_requirements.waterheating.quantity;
            f_requirements[system.fuel].demand += demand;
            f_requirements[system.fuel].fuel_input += demand / system.efficiency;
            f_requirements[system.fuel].fraction += system.fraction_water_heating;
        }
    });
    // Copy over to data.fuel_requirements and calculate total fuel input
    data.fuel_requirements.waterheating.quantity = 0;
    for (fuel in f_requirements) {
        data.fuel_requirements.waterheating.list.push(f_requirements[fuel]);
        data.fuel_requirements.waterheating.quantity += f_requirements[fuel].fuel_input;
    }

    //////////////////////////////////////
    // Fuel requirements  Space Heating //
    //////////////////////////////////////
    var f_requirements = [];
    data.heating_systems.forEach(function (system) {
        if (system.provides == 'heating' || system.provides == 'heating_and_water') {
            // Sort them by 'fuel'
            if (f_requirements[system.fuel] == undefined) {
                f_requirements[system.fuel] = {demand: 0, fraction: 0, fuel: system.fuel, fuel_input: 0};
            }
            let demand;
            if (data.energy_requirements.space_heating === undefined) {
                demand = 0
            } else {
                demand = system.fraction_space * data.energy_requirements.space_heating.quantity;
            }
            f_requirements[system.fuel].demand += demand;
            f_requirements[system.fuel].fuel_input += demand / (system.winter_efficiency / 100);
            f_requirements[system.fuel].fraction += system.fraction_space;
        }
    });
    // Copy over to data.fuel_requirements and calculate total fuel input
    data.fuel_requirements.space_heating.quantity = 0;
    for (fuel in f_requirements) {
        data.fuel_requirements.space_heating.list.push(f_requirements[fuel]);
        data.fuel_requirements.space_heating.quantity += f_requirements[fuel].fuel_input;
    }

};

/*---------------------------------------------------------------------------------------------
 // FUEL REQUIREMENTS
 // Calculates the totals for each type of fuel (Mains Gas, Standard Tariff, etc) from
 // the fuel requirements (appliances, cooking, space_heating, etc)
 //
 // Inputs from user:
 //      -  data.use_generation
 //
 // Inputs from other modules:
 //      - data.fuel_requirements
 //	- data.fuels
 //	- data.generation
 //
 // Global Outputs:
 //	- data.fuel_totals
 //	- data.energy_use
 //	- data.annualco2
 //	- data.energy_delivered
 //	- data.total_cost
 //	- data.primary_energy_use
 //	- data.net_cost
 //
 //---------------------------------------------------------------------------------------------*/
calc.fuel_requirements = function (data) {

    // Fuel totals
    data.fuel_totals = {}; // remove this line when we get rif of energy_systems
    for (z in data.fuel_requirements) {
        for (x in data.fuel_requirements[z].list) {
            data.fuel_requirements[z].list[x].fuel_input_monthly = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

            let fuel = data.fuel_requirements[z].list[x].fuel;
            if (data.fuel_totals[fuel] == undefined) {
                data.fuel_totals[fuel] = {name: fuel, quantity: 0};
            }
            if (isNaN(data.fuel_requirements[z].list[x].fuel_input) != true) {
                data.fuel_totals[fuel].quantity += data.fuel_requirements[z].list[x].fuel_input;
            }
        }
    }

    // Total energy use, fuel costs, Annual CO2 and primary energy due to the energy requirements
    data.energy_use = 0;
    data.annualco2 = 0;
    data.energy_delivered = 0;
    for (z in data.fuel_totals) {
        data.fuel_totals[z].annualcost = data.fuel_totals[z].quantity * data.fuels[z].fuelcost / 100 + data.fuels[z].standingcharge;
        //data.fuel_totals[z].fuelcost = data.fuels[z].fuelcost;
        data.fuel_totals[z].primaryenergy = data.fuel_totals[z].quantity * data.fuels[z].primaryenergyfactor;
        data.fuel_totals[z].annualco2 = data.fuel_totals[z].quantity * data.fuels[z].co2factor;
        data.total_cost += data.fuel_totals[z].annualcost;
        data.energy_use += data.fuel_totals[z].quantity;
        data.primary_energy_use += data.fuel_totals[z].primaryenergy;
        data.annualco2 += data.fuel_totals[z].annualco2;
    }
    data.energy_delivered = data.energy_use;
    // Annual CO2, primary energy and cost saved due to generation. Be aware generation is not used for the calculation of Energy use
    if (data.use_generation == 1) {
        data.fuel_totals['generation'] = {
            name: 'generation',
            quantity: -data.generation.total_generation,
            annualco2: -data.generation.total_CO2,
            primaryenergy: -data.generation.total_primaryenergy,
            annualcost: -data.generation.total_used_onsite * data.fuels.generation.fuelcost / 100
        };
        data.primary_energy_use += data.fuel_totals['generation'].primaryenergy;
        data.annualco2 += data.fuel_totals['generation'].annualco2;
        data.total_cost += data.fuel_totals['generation'].annualcost;
        data.energy_delivered += data.fuel_totals['generation'].quantity;
    }

    data.net_cost = data.use_generation == 1 ? data.total_cost - data.total_income : data.total_cost;
    return data;
};



/*---------------------------------------------------------------------------------------------
 // SAP
 // Calculates SAP (energy cost) and EI (environmental impact) ratings.
 // Beware SAP doesn't take into account the energy for appliances
 // and cooking for the calculation of total cost and primary energy use.
 //
 // Inputs from other modules:
 //      - data
 //
 // Global Outputs:
 //	- data.SAP
 //
 // Module Variables:
 //	- data.SAP.total_costSAP
 //	- data.SAP.annualco2SAP
 //	- data.SAP.kgco2perm2SAP
 //	- data.SAP.energy_cost_deflator
 //	- data.SAP.energy_cost_factor
 //	- data.SAP.primary_energy_useSAP
 //	- data.SAP.primary_energy_use_m2SAP
 //	- data.SAP.rating
 //	- data.SAP.EI_rating
 //
 //--------------------------------------------------------------------------------------------*/

calc.SAP = function (data) {
    // Calculate total energy cost in the SAP way: taking into account only fuel cost for space heating, water heating, lighting and fans and pumps
    let dataSAP = emulateJsonRoundTrip(data);
    dataSAP.total_cost = 0;
    dataSAP.primary_energy_use = 0;
    dataSAP.fuel_requirements.appliances = {quantity: {}, list: []};
    dataSAP.fuel_requirements.cooking = {quantity: {}, list: []};
    dataSAP = calc.fuel_requirements(dataSAP);
    // SAP
    data.SAP.total_costSAP = dataSAP.total_cost;
    data.SAP.annualco2SAP = dataSAP.annualco2;
    data.SAP.kgco2perm2SAP = dataSAP.annualco2 / data.TFA;
    data.SAP.energy_cost_deflator = 0.42;
    data.SAP.energy_cost_factor = (data.SAP.total_costSAP * data.SAP.energy_cost_deflator) / (data.TFA + 45.0);
    data.SAP.primary_energy_useSAP = dataSAP.primary_energy_use;
    data.SAP.primary_energy_use_m2SAP = dataSAP.primary_energy_use / data.TFA;
    if (data.SAP.energy_cost_factor >= 3.5) {
        data.SAP.rating = 117 - 121 * (Math.log(data.SAP.energy_cost_factor) / Math.LN10);
    } else {
        data.SAP.rating = 100 - 13.95 * data.SAP.energy_cost_factor;
    }
    let CF = data.SAP.annualco2SAP / (data.TFA + 45);
    if (CF >= 28.3) {
        data.SAP.EI_rating = 200 - 95 * (Math.log(CF) / Math.LN10);
    } else {
        data.SAP.EI_rating = 100 - 1.34 * CF;
    }
    return data;
};

/*---------------------------------------------------------------------------------------------
 // currentenergy
 // Calculates totals from data from bills
 //
 // Inputs from user:
 //	- data.currentenergy.use_by_fuel
 //	- data.currentenergy.onsite_generation
 //	- data.currentenergy.generation
 //
 // Inputs from other modules:
 //	- data.fuels
 //
 // Global Outputs:
 //	- data.TFA
 //	- data.occupancy
 //
 // Module Variables:
 //      - data.currentenergy.primaryenergy_annual_kwh
 //      - data.currentenergy.total_co2
 //      - data.currentenergy.total_cost
 //      - data.currentenergy.annual_net_cost
 //      - data.currentenergy.primaryenergy_annual_kwhm2
 //      - data.currentenergy.total_co2m2
 //      - data.currentenergy.total_costm2
 //      - data.currentenergy.energyuseperperson
 //
 //--------------------------------------------------------------------------------------------*/

calc.currentenergy = function (data) {
    if (data.currentenergy == undefined) {
        data.currentenergy = {};
    }
    if (data.currentenergy.use_by_fuel == undefined) {
        data.currentenergy.use_by_fuel = {};
    }
    if (data.currentenergy.generation == undefined) {
        data.currentenergy.generation = {annual_generation: 0, annual_CO2: 0, primaryenergy: 0, annual_savings: 0, fraction_used_onsite: 0.25, annual_FIT_income: 0};
    }



    let total_co2 = 0;
    let total_cost = 0;
    let primaryenergy_annual_kwh = 0;
    let enduse_annual_kwh = 0;
    for (let fuel in data.currentenergy.use_by_fuel) {
        // Calculations for current fuel
        let f_use = data.currentenergy.use_by_fuel[fuel];
        f_use.annual_co2 = f_use.annual_use * data.fuels[fuel].co2factor;
        f_use.primaryenergy = f_use.annual_use * data.fuels[fuel].primaryenergyfactor;
        if (f_use.annual_use > 0) {
            f_use.annualcost = f_use.annual_use * data.fuels[fuel].fuelcost / 100 + data.fuels[fuel].standingcharge;
        } else {
            f_use.annualcost = 0;
        }

        // Calculation of totals
        total_co2 += f_use.annual_co2;
        total_cost += f_use.annualcost;
        primaryenergy_annual_kwh += f_use.primaryenergy;
        enduse_annual_kwh += f_use.annual_use;
    }

    if (data.currentenergy.onsite_generation === 1) { // See issue 304
        // Add to the totals the amount of energy generated that was used onsite
        enduse_annual_kwh += data.currentenergy.generation.fraction_used_onsite * data.currentenergy.generation.annual_generation;
        primaryenergy_annual_kwh += data.fuels.generation.primaryenergyfactor * data.currentenergy.generation.fraction_used_onsite * data.currentenergy.generation.annual_generation;
        total_co2 += data.fuels.generation.co2factor * data.currentenergy.generation.fraction_used_onsite * data.currentenergy.generation.annual_generation;

        // Calculate generation totals (savings due to generation)
        data.currentenergy.generation.primaryenergy = data.fuels.generation.primaryenergyfactor * data.currentenergy.generation.annual_generation;
        data.currentenergy.generation.annual_CO2 = data.fuels.generation.co2factor * data.currentenergy.generation.annual_generation;
        data.currentenergy.generation.annual_savings = data.fuels.generation.fuelcost / 100 * data.currentenergy.generation.fraction_used_onsite * data.currentenergy.generation.annual_generation;

        // Calculate totals taking into account generation
        total_co2 -= data.currentenergy.generation.annual_CO2;
        primaryenergy_annual_kwh -= data.currentenergy.generation.primaryenergy;
        // total_cost -= data.currentenergy.generation.annual_savings; -- Annual savings are not added: this is money that the user would pay on top of what they already pay if they didn't have generation
    }


    data.currentenergy.primaryenergy_annual_kwh = primaryenergy_annual_kwh;
    data.currentenergy.total_co2 = total_co2;
    data.currentenergy.total_cost = total_cost;
    data.currentenergy.annual_net_cost = total_cost - data.currentenergy.generation.annual_FIT_income;
    data.currentenergy.primaryenergy_annual_kwhm2 = primaryenergy_annual_kwh / data.TFA;
    data.currentenergy.total_co2m2 = total_co2 / data.TFA;
    data.currentenergy.total_costm2 = total_cost / data.TFA;
    data.currentenergy.energyuseperperson = (enduse_annual_kwh / 365.0) / data.occupancy;
    data.currentenergy.enduse_annual_kwh = enduse_annual_kwh;
    data.currentenergy.enduse_annual_kwhm2 = enduse_annual_kwh / data.TFA;

    return data;
};


/*---------------------------------------------------------------------------------------------
 // fans_and_pumps_and_combi_keep_hot
 // Calculates Annual energy requirements for pumps, fans and electric keep-hot
 //
 // Inputs from other modules:
 //      - data.heating_systems
 //	- data.ventilation.ventilation_type
 //	- data.ventilation.EVP
 //	- data.use_SHW
 //	- data.SHW.pump
 //
 // Global Outputs:
 //	- data.fans_and_pumps
 //      - data.energy_requirements.fans_and_pumps
 //	- data.fuel_requirements.fans_and_pumps
 //
 //---------------------------------------------------------------------------------------------*/

calc.fans_and_pumps_and_combi_keep_hot = function (data) {
    // 1.- Annual energy requirements for pumps, fans and electric keep-hot
    let annual_energy = 0;
    let monthly_energy = [];
    // From heating systems (Central heating pump, fans and supply pumps, keep hot facility
    data.heating_systems.forEach(function (system) {
        annual_energy += 1.0 * system.central_heating_pump;

        // There was a broken if-statement here attempting to check for warm
        // air systems and compute energy from the specific fan power and the
        // building volume, but we didn't have specific fan power included in
        // any library data, and the string comparison check had a typo in it
        // anyway. This probably means we are not totally SAP compliant here
        // and should be reviewed when this section is refactored.
        annual_energy += 1.0 * system.fans_and_supply_pumps;

        switch (system.combi_loss) {
            case 'Instantaneous, with keep-hot facility controlled by time clock':
                annual_energy += 600;
                break;
            case 'Instantaneous, with keep-hot facility not controlled by time clock':
                annual_energy += 900;
                break;
        }
    });
    // From Ventilation (SAP2012 document page 213)
    let ventilation_type = '';
    switch (data.ventilation.ventilation_type) {
        case 'NV':
        case 'IE':
        case 'PS':
            ventilation_type = 'd'; // Natural ventilation or whole house positive input ventilation from loft or passive stack'
            break;
        case 'DEV':
        case'MEV':
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
    switch (ventilation_type) {
        case 'd':  // Natural ventilation or whole house positive input ventilation from loft or passive stack'
            // According to SAP we should do nothing - In this case annual energy is 0, see SAP2012 2.6.1: The energy used by the fan is taken as counterbalancing the effect of using slightly warmer air from the loft space compared with outside
            // But we think this is not accurate, so we add 28kWh/year per Extract Ventilation Point (BREDEM)
            for (z in data.ventilation.EVP) {
                let v_rate = 1.0 * data.ventilation.EVP[z].ventilation_rate;
                if (v_rate > 0) {
                    annual_energy += 28;
                }
            }
            break;
        case 'c':  //Positive input ventilation (from outside) or mechanical extract ventilation
            annual_energy += 2.5 * data.ventilation.system_specific_fan_power * 1.22 * data.volume; // annual_energy += IUF * SFP * 1.22 * V;
            break;
        case 'a':  //Balanced mechanical ventilation with heat recovery (MVHR)
            annual_energy += 2.5 * data.ventilation.system_specific_fan_power * 2.44 * data.ventilation.system_air_change_rate * data.volume; //annual_energy += IUF * SFP * 2.44 * nmech * V;
            break;
        case 'b':  //Balanced mechanical ventilation without heat recovery (MV)
            annual_energy += 2.5 * data.ventilation.system_specific_fan_power * 2.44 * data.ventilation.system_air_change_rate * data.volume; //annual_energy += IUF * SFP * 2.44 * nmech * V;
            break;
    }

    // From Solar Hot Water
    if (data.use_SHW == 1) {
        if (data.SHW.pump != undefined && data.SHW.pump == 'electric') {
            annual_energy += 50;
        }
    }

    // Energy and fuel requirements
    for (m = 0; m < 12; m++) {
        monthly_energy[m] = annual_energy / 12;
    }
    if (annual_energy > 0) {
        data.energy_requirements.fans_and_pumps = {name: 'Fans and pumps', quantity: annual_energy, monthly: monthly_energy};

        if (data.fans_and_pumps == undefined) {
            data.fans_and_pumps = [{fuel: 'Standard Tariff', fraction: 1}];
        }

        data.fuel_requirements.fans_and_pumps.quantity = 0;

        data.fans_and_pumps.forEach(function (fuel_requirement, index) {
            fuel_requirement.demand = annual_energy * fuel_requirement.fraction;
            fuel_requirement.fuel_input = annual_energy * fuel_requirement.fraction; // We assume efficiency of Electrical system is 1
            data.fuel_requirements.fans_and_pumps.quantity += fuel_requirement.fuel_input;
            data.fuel_requirements.fans_and_pumps.list.push(fuel_requirement);
        });
    }
};


/*---------------------------------------------------------------------------------------------
 // gains
 // Calculates gains for "metabolic", "losses", "fans and pumps"
 //
 // Inputs from other modules:
 //     - data.space_heating.use_utilfactor_forgains
 //     - data.heating_systems
 //	- data.occupancy
 //	- data.ventilation.ventilation_type
 //	- data.ventilation.system_specific_fan_power
 //	- data.volume
 //
 // Global Outputs:
 //	- data.gains_W['fans_and_pumps']
 //	- data.gains_W['metabolic']
 //	- data.gains_W['losses']
 //
 //---------------------------------------------------------------------------------------------*/

calc.metabolic_losses_fans_and_pumps_gains = function (data) {
    //Internal gains for "Metabolic" and "Losses"
    data.gains_W['metabolic'] = new Array();
    data.gains_W['losses'] = new Array();
    for (m = 0; m < 12; m++) {
        if (typeof data.space_heating === 'object') {
            if (data.space_heating.use_utilfactor_forgains) {
                data.gains_W['metabolic'][m] = 60 * data.occupancy;
                data.gains_W['losses'][m] = -40 * data.occupancy;
            } else {
                data.gains_W['metabolic'][m] = 50 * data.occupancy;
                data.gains_W['losses'][m] = -40 * data.occupancy;
            }
        }
    }

    //  Fans and Pumps - SAP2012 table 5, p. 215
    let monthly_heat_gains = 0;
    data.gains_W['fans_and_pumps'] = new Array();

    // From heating systems
    data.heating_systems.forEach(function (system) {
        if (system.category == 'Warm air system') {
            monthly_heat_gains += 1.0 * system.sfp * 0.04 * data.volume;
        } else if (system.central_heating_pump_inside != undefined && system.central_heating_pump_inside !== false) {
            let power = system.central_heating_pump * 1000 / (24 * 365); // kWh/year to W
            monthly_heat_gains += power;
        }
    });
    // Note: From if there was an oil boiler with pump inside dwelling we should add 10W of gains, the problem is that i don't know where in MHEP we can as this. Therefor we assume that in the case of havin an oil boiler the pump is outside :(

    // From ventilation
    let ventilation_type = '';
    switch (data.ventilation.ventilation_type) {
        case 'NV':
        case 'IE':
        case 'PS':
            ventilation_type = 'd'; // Natural ventilation or whole house positive input ventilation from loft'
            break;
        case 'DEV':
        case'MEV':
            ventilation_type = 'c'; // Whole house extract ventilation or positive input ventilation from outside
            break;
        case 'MV':
            ventilation_type = 'b'; // Balanced mechanical ventilation without heat recovery (MV)
            break;
        case 'MVHR':
            ventilation_type = 'a'; //Balanced mechanical ventilation with heat recovery (MVHR)
            break;
    }
    switch (ventilation_type) {
        case 'a':  //Balanced mechanical ventilation with heat recovery (MVHR), the heat gains in this case are included in the MVHR efficiency
        case 'd':  //Positive input ventilation (from loft space)
            // Do nothing
            break;
        case 'c':  //Positive input ventilation (from outside) or mechanical extract ventilation
            monthly_heat_gains += 2.5 * data.ventilation.system_specific_fan_power * 0.12 * data.volume; // monthly_heat_gains += IUF * SFP *  0.12 *  V;
            break;
        case 'b':  //Balanced mechanical ventilation without heat recovery (MV)
            monthly_heat_gains += 2.5 * data.ventilation.system_specific_fan_power * 0.06 * data.volume; //monthly_heat_gains += IUF * SFP *  0.06 *  V;
            break;
    }

    for (let i = 0; i < 12; i++) {
        data.gains_W['fans_and_pumps'][i] = monthly_heat_gains;
    }

};

/*---------------------------------------------------------------------------------------------
 // gains_summary
 // Calculates total solar gains, total internal gains and both together
 //      - Solar gains are calculated in calc.fabric
 //      - Lighting, cooking and appliances are calculated in new code
 //      - Water heating gains are calculated in water_heating calc.water_heating()
 //      - Gains for fans and pumps, losses and metabolice are calculated in calc.metabolic_losses_fans_and_pumps_gains()
 //      - Useful gains (after applying utilisation factor) are calculated in calc.space_heating()
 //
 //
 // Inputs from other modules:
 //      - data.gains_W
 //
 // Global Outputs:
 //	- data.total_internal_gains
 //	- data.total_solar_gains
 //	- data.total_internal_and_solar_gains
 //
 //---------------------------------------------------------------------------------------------*/

calc.gains_summary = function (data) {
    data.total_internal_gains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    data.total_internal_and_solar_gains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    data.total_solar_gains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (m = 0; m < 12; m++) {
        for (g in data.gains_W) {
            data.total_internal_and_solar_gains[m] += data.gains_W[g][m];
            if (g != 'solar') {
                data.total_internal_gains[m] += data.gains_W[g][m];
            } else {
                data.total_solar_gains[m] += data.gains_W[g][m];
            }
        }
    }

    return data;
};


/*---------------------------------------------------------------------------------------------
 // fabric_energy_efficiency
 // Calculates Fabric Energy Efficiency according to the procedure defined in SAP2012 p.31
 // Basically we run the model again using the same data object with modifications to make it "standard"
 // so houses can be compared
 //
 // Inputs from other modules:
 //      - None
 //
 // Global Outputs:
 //	- data.FEE
 //
 //---------------------------------------------------------------------------------------------*/

calc.fabric_energy_efficiency = function (data) {
    let data_FEE = emulateJsonRoundTrip(data);

    // correct openBEM deviations from SAP
    data_FEE.use_custom_occupancy = false;
    data_FEE.water_heating.override_annual_energy_content = false;

    // climate is UK average for heating and cooling
    data_FEE.region = 0;

    // natural ventilation with intermittent extract fans
    // 2 extract fans for total floor area up to 70 m², 3 for total floor area > 70 m² and up to 100 m², 4 for total floor area > 100 m²
    data_FEE.ventilation.ventilation_type = 'IE'; // Intermittent extract ventilation (same than natural for calculations but allows for the addtition of fans)
    data_FEE.EVP = [{id: 1, ventilation_rate: 10}, {id: 2, ventilation_rate: 10}];
    if (data_FEE.TFA > 70) {
        data_FEE.EVP.push({id: 3, ventilation_rate: 10});
    }
    if (data_FEE.TFA > 100) {
        data_FEE.EVP.push({id: 4, ventilation_rate: 10});
    }

    // for calculation of heat gains from the hot water system worksheet (46) to (61) inclusive and (63) are set to zero (equivalent to an instantaneous water heater)
    data_FEE.heating_systems.forEach(function (system) {
        if (system.provides == 'water' || system.provides == 'heating_and_water') {
            system.instantaneous_water_heating = 1;
        }
    });

    // 100% low energy lights
    data_FEE.LAC_calculation_type = 'SAP';
    data_FEE.LAC.LLE = data_FEE.LAC.LLE + data_FEE.LAC.L;
    data_FEE.LAC.L = 0;

    // column (B) of Table 5 is used for internal gains in the heating calculation
    data_FEE.space_heating.use_utilfactor_forgains = true; // for metabolic gains and loses
    data_FEE.LAC.reduced_heat_gains_lighting = true;
    data_FEE.LAC.energy_efficient_appliances = true;
    data_FEE.LAC.energy_efficient_cooking = true;

    // column (A) of Table 5 is used for internal gains in the cooling calculation
    // N/A

    // overshading of windows not less than average (i.e. very little is changed to average)
    data_FEE.fabric.elements.forEach(function (element) {
        if (element.type == 'window' || element.type == 'Window' || element.type == 'Door' || element.type == 'Roof_light') {
            if (element.overshading == 3) {
                element.overshading = 2;
            }
        }
    });

    // no heat gains from pumps or fans
    // Set after metabolic_losses_fans_and_pumps_gains calculation

    // the heating system has responsiveness 1.0 and control type 2, no temperature adjustment,
    data_FEE.heating_systems.forEach(function (system) {
        if (system.provides == 'heating' || system.provides == 'heating_and_water') {
            system.responsiveness = 1;
            system.heating_controls = 2;
            system.temperature_adjustment = 0;
        }
    });

    // temperature and heating periods according to Table 9 irrespective of the actual heating system
    data_FEE.temperature.target = 21;
    data_FEE.temperature.hours_off['weekday'] = [7, 8];
    data_FEE.temperature.hours_off['weekend'] = [8];

    // cooled fraction is 1.0
    // N/A

    // Run the model
    const combinedModulesR = CombinedModules.fromLegacy(data_FEE);
    if (combinedModulesR.isErr()) {
        data.FEE = NaN;
        return;
    }

    const combinedModules = combinedModulesR.unwrap();
    setDefaultLegacyInputs(data_FEE)
    setBlankLegacyOutputs(data_FEE)
    combinedModules.mutateLegacyData(data_FEE)

    calc.currentenergy(data_FEE);
    calc.metabolic_losses_fans_and_pumps_gains(data_FEE);
    data_FEE.gains_W['fans_and_pumps'] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    calc.temperature(data_FEE);
    calc.fans_and_pumps_and_combi_keep_hot(data_FEE);
    calc.gains_summary(data_FEE);
    calc.space_heating(data_FEE);

    data.FEE = data_FEE.space_heating_demand_m2;
};

//---------------------------------------------------------------------------------------------
// SEPARATED MODEL FUNCTIONS
//---------------------------------------------------------------------------------------------
// U3.2 Solar radiation on vertical and inclined surfaces
function solar_rad(region, orient, p, m) {
    let k = datasets.k; // convert degrees into radians
    let radians = (p / 360.0) * 2.0 * Math.PI;
    let sinp = Math.sin(radians / 2.0); // sinp = sin(p/2)
    let sin2p = sinp * sinp;
    let sin3p = sinp * sinp * sinp;
    let A = k[1][orient] * sin3p + k[2][orient] * sin2p + k[3][orient] * sinp;
    let B = k[4][orient] * sin3p + k[5][orient] * sin2p + k[6][orient] * sinp;
    let C = k[7][orient] * sin3p + k[8][orient] * sin2p + k[9][orient] * sinp + 1;
    let latitude = (datasets.table_u4[region][0] / 360) * 2 * Math.PI; // get latitude in degrees and convert to radians
    let sol_dec = (datasets.solar_declination[m] / 360) * 2 * Math.PI; // get solar_declination in degrees and convert to radians
    let cos1 = Math.cos(latitude - sol_dec);
    let cos2 = cos1 * cos1;
    // Rh-inc(orient, p, m) = A × cos2(φ - δ) + B × cos(φ - δ) + C
    let Rh_inc = A * cos2 + B * cos1 + C;
    return datasets.table_u3[region][m] * Rh_inc;
}

// Annual solar radiation on a surface
function annual_solar_rad(region, orient, p) {
    // month 0 is january, 11: december
    let sum = 0;
    for (let m = 0; m < 12; m++) {
        sum += datasets.table_1a[m] * solar_rad(region, orient, p, m);
    }
    return 0.024 * sum;
}


function calc_solar_gains_from_windows(windows, region) {
    let gains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (z in windows) {
        let orientation = windows[z]['orientation'];
        let area = windows[z]['area'];
        let overshading = windows[z]['overshading'];
        let g = windows[z]['g'];
        let ff = windows[z]['ff'];
        // The gains for a given window are calculated for each month         // the result of which needs to be put in a bin for totals for jan, feb etc..
        for (let month = 0; month < 12; month++) {
            // access factor is time of year dependent
            // Summer months: 5:June, 6:July, 7:August and 8:September (where jan = month 0)
            let summer = 0;
            if (month >= 5 && month <= 8) {
                summer = 1;
            }
            let access_factor = datasets.table_6d_solar_access_factor[overshading][summer];
            // Map orientation code from window to solar rad orientation codes.
            if (orientation == 5) {
                orientation = 3;
            } // SE/SW
            if (orientation == 6) {
                orientation = 2;
            } // East/West
            if (orientation == 7) {
                orientation = 1;
            } // NE/NW

            gains[month] += access_factor * area * solar_rad(region, orientation, 90, month) * 0.9 * g * ff;
        }
    }
    return gains;
}

// Calculation of mean internal temperature for heating
// Calculation of mean internal temperature is based on the heating patterns defined in Table 9.

function calc_utilisation_factor(TMP, HLP, H, Ti, Te, G) {
    /*
     Symbols and units
     H = heat transfer coefficient, (39)m (W/K)
     G = total gains, (84)m (W)
     Ti = internal temperature (°C)
     Te = external temperature, (96)m (°C)
     TMP = Thermal Mass Parameter, (35), (kJ/m2K) (= Cm for building / total floor area)
     HLP = Heat Loss Parameter, (40)m (W/m2K)
     τ = time constant (h)
     η = utilisation factor
     L = heat loss rate (W)
     */

    // Calculation of utilisation factor

    // TMP = thermal Mass / Total floor area
    // HLP = heat transfer coefficient (H) / Total floor area

    let tau = TMP / (3.6 * HLP);
    let a = 1.0 + tau / 15.0;
    // calc losses
    let L = H * (Ti - Te);
    // ratio of gains to losses
    let y = G / L;
    // Note: to avoid instability when γ is close to 1 round γ to 8 decimal places
    // y = y.toFixed(8);
    y = Math.round(y * 100000000.0) / 100000000.0;
    let n = 0.0;
    if (y > 0.0 && y != 1.0) {
        n = (1.0 - Math.pow(y, a)) / (1.0 - Math.pow(y, a + 1.0));
    }
    if (y == 1.0) {
        n = a / (a + 1.0);
    }
    if (y <= 0.0) {
        n = 1.0;
    }
    if (isNaN(n)) {
        n = 0;
    }
    return n;
}

function calc_temperature_reduction(TMP, HLP, H, Ti, Te, G, R, Th, toff) {
    // Calculation of utilisation factor
    let tau = TMP / (3.6 * HLP);
    let a = 1.0 + tau / 15.0;
    let L = H * (Ti - Te);
    let y = G / L;
    // Note: to avoid instability when γ is close to 1 round γ to 8 decimal places
    // y = y.toFixed(8);
    y = Math.round(y * 100000000.0) / 100000000.0;
    let n = 0.0;
    if (y > 0.0 && y != 1.0) {
        n = (1.0 - Math.pow(y, a)) / (1.0 - Math.pow(y, a + 1.0));
    }
    if (y == 1.0) {
        n = a / (a + 1.0);
    }
    let tc = 4.0 + 0.25 * tau;
    let Tsc = (1.0 - R) * (Th - 2.0) + R * (Te + n * G / H);
    let u;
    if (toff <= tc) {
        u = 0.5 * toff * toff * (Th - Tsc) / (24 * tc);
    }
    if (toff > tc) {
        u = (Th - Tsc) * (toff - 0.5 * tc) / 24;
    }
    if (isNaN(u)) {
        u = 0;
    }
    return u;
}

function calc_MeanInternalTemperature(Th, hours_off, TMP, HLP, H, Te, G, R) {
    let Ti_area = [];
    for (let m = 0; m < 12; m++) {
        let Thm = Th[m];
        let Ti = Th[m];
        // (TMP,HLP,H,Ti,Te,G, R,Th,toff)
        let temp = {weekday: 0, weekend: 0};
        for (let type in hours_off) {
            for (z in hours_off[type]) {
                temp[type] += calc_temperature_reduction(TMP, HLP[m], H[m], Ti, Te[m], G[m], R, Thm, hours_off[type][z]);
            }
        }
        let Tweekday = Th[m] - temp.weekday;
        let Tweekend = Th[m] - temp.weekend;
        Ti_area[m] = (5 * Tweekday + 2 * Tweekend) / 7;
    }
    return Ti_area;
}

function calc_Th2(control_type, Th, HLP) {
    let temp = [];
    for (let m = 0; m < 12; m++) {
        let tmpHLP = HLP[m];
        if (tmpHLP > 6.0) {
            tmpHLP = 6.0;
        }
        if (control_type == 1) {
            temp[m] = Th - 0.5 * tmpHLP;
        }
        if (control_type == 2) {
            temp[m] = Th - tmpHLP + (Math.pow(tmpHLP, 2) / 12);
        }
        if (control_type == 3) {
            temp[m] = Th - tmpHLP + (Math.pow(tmpHLP, 2) / 12);
        }
        if (isNaN(temp[m])) {
            temp[m] = Th;
        }
    }
    return temp;
}

export const calcRun = calc.run.bind(calc)
