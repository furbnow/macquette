/* eslint-disable */
let z;
import { datasets } from '../reference-datasets';

/*---------------------------------------------------------------------------------------------
 // applianceCarbonCoop
 // Alternative method to calculate heat gains, energy requirements, CO2 emissions and fuel requirements for appliances
 //
 // Inputs from user:
 //      - data.applianceCarbonCoop.list
 //
 // Inputs from other modules:
 //	- data.LAC_calculation_type
 //
 // Global Outputs:
 //	- data.energy_requirements.appliances
 //	- data.energy_requirements.cooking
 //	- data.fuel_requirements.appliances
 //	- data.fuel_requirements.cooking
 //
 // Module Variables:
 //	- data.applianceCarbonCoop.energy_demand_total
 //	- data.applianceCarbonCoop.energy_demand_monthly 	 // shows total for category (cooking and appliances) and both totgether
 //	- data.applianceCarbonCoop.energy_demand_by_type_of_fuel
 //	- data.applianceCarbonCoop.gains_W
 //	- data.applianceCarbonCoop.gains_W_monthly	 // shows total for category (cooking and appliances) and both totgether
 //	- data.applianceCarbonCoop.fuel_input_total
 //	- data.applianceCarbonCoop.list 	// items updated with the energy demand and fuel input values
 //
 //---------------------------------------------------------------------------------------------*/

export function legacyApplianceCarbonCoop(data) {
    if (data.applianceCarbonCoop == undefined) {
        data.applianceCarbonCoop = { list: [] };
    }
    // Variables in the data object that hold the results
    data.applianceCarbonCoop.energy_demand_total = {
        appliances: 0,
        cooking: 0,
        total: 0,
    };
    data.applianceCarbonCoop.energy_demand_monthly = {
        appliances: [],
        cooking: [],
        total: [],
    };
    data.applianceCarbonCoop.energy_demand_by_type_of_fuel = {
        cooking: {},
        appliances: {},
        total: {},
    };
    data.applianceCarbonCoop.gains_W = [];
    data.applianceCarbonCoop.gains_W_monthly = {};
    data.applianceCarbonCoop.fuel_input_total = { appliances: 0, cooking: 0 };
    // 1. Energy demand and fuel_input
    // We do the calculations for each appliance in the list
    for (z in data.applianceCarbonCoop.list) {
        let item = data.applianceCarbonCoop.list[z];
        if (item.energy_demand == undefined) {
            item.energy_demand = 0;
        }
        // Energy demand calculation
        item.energy_demand =
            item.number_used *
            item.norm_demand *
            item.utilisation_factor *
            item.reference_quantity *
            item.frequency;
        if (item.type_of_fuel == 'Electricity' && item.a_plus_rated === 1) {
            item.energy_demand = 0.75 * item.energy_demand;
        }
        item.fuel_input = item.energy_demand / item.efficiency;
        // Results: totals from all the appliances
        data.applianceCarbonCoop.energy_demand_total.total += item.energy_demand;
        if (
            data.applianceCarbonCoop.energy_demand_by_type_of_fuel[item.type_of_fuel] ==
            undefined
        ) {
            data.applianceCarbonCoop.energy_demand_by_type_of_fuel[item.type_of_fuel] = 0;
        }
        data.applianceCarbonCoop.energy_demand_by_type_of_fuel[item.type_of_fuel] +=
            item.energy_demand;
        // Results: totals by category
        if (item.category === 'Cooking') {
            data.applianceCarbonCoop.energy_demand_total.cooking += item.energy_demand;
        } else {
            data.applianceCarbonCoop.energy_demand_total.appliances += item.energy_demand;
        }
    }

    // 2. Energy demand monthly
    for (m = 0; m < 12; m++) {
        data.applianceCarbonCoop.energy_demand_monthly.appliances[m] =
            data.applianceCarbonCoop.energy_demand_total.appliances / 12;
        data.applianceCarbonCoop.energy_demand_monthly.cooking[m] =
            data.applianceCarbonCoop.energy_demand_total.cooking / 12;
        data.applianceCarbonCoop.energy_demand_monthly.total[m] =
            data.applianceCarbonCoop.energy_demand_total.appliances / 12 +
            data.applianceCarbonCoop.energy_demand_total.cooking / 12;
    }

    // 3. Gains
    data.applianceCarbonCoop.gains_W['Appliances'] =
        data.applianceCarbonCoop.energy_demand_total.appliances;
    data.applianceCarbonCoop.gains_W['Cooking'] =
        data.applianceCarbonCoop.energy_demand_total.cooking;
    data.applianceCarbonCoop.gains_W_monthly['Appliances'] = [];
    data.applianceCarbonCoop.gains_W_monthly['Cooking'] = [];
    for (var m = 0; m < 12; m++) {
        data.applianceCarbonCoop.gains_W_monthly['Appliances'][m] =
            (data.applianceCarbonCoop.gains_W['Appliances'] * datasets.table_1a[m]) /
            365.0;
        data.applianceCarbonCoop.gains_W_monthly['Cooking'][m] =
            (data.applianceCarbonCoop.gains_W['Cooking'] * datasets.table_1a[m]) / 365.0;
    }

    // 4. Energy requirements
    if (data.LAC_calculation_type == 'carboncoop_SAPlighting') {
        if (data.applianceCarbonCoop.energy_demand_total.appliances > 0) {
            data.energy_requirements.appliances = {
                name: 'Appliances',
                quantity: data.applianceCarbonCoop.energy_demand_total.appliances,
                monthly: data.applianceCarbonCoop.energy_demand_monthly.appliances,
            };
            data.gains_W['Appliances'] =
                data.applianceCarbonCoop.gains_W_monthly['Appliances'];
        }

        if (data.applianceCarbonCoop.energy_demand_total.cooking > 0) {
            data.energy_requirements.cooking = {
                name: 'Cooking',
                quantity: data.applianceCarbonCoop.energy_demand_total.cooking,
                monthly: data.applianceCarbonCoop.energy_demand_monthly.cooking,
            };
            data.gains_W['Cooking'] = data.applianceCarbonCoop.gains_W_monthly['Cooking'];
        }
    }

    // 5. Fuel requirements
    // Add fuels

    let f_requirements = { cooking: {}, appliances: {} };
    if (data.LAC_calculation_type == 'carboncoop_SAPlighting') {
        // Sor them by 'cooking' or 'appliances' and 'fuel'
        data.applianceCarbonCoop.list.forEach(function (item) {
            let category = item.category == 'Cooking' ? 'cooking' : 'appliances';
            if (f_requirements[category][item.fuel] == undefined) {
                f_requirements[category][item.fuel] = {
                    demand: 0,
                    fraction: 0,
                    fuel: item.fuel,
                    system_efficiency: item.efficiency,
                    fuel_input: 0,
                };
            }
            f_requirements[category][item.fuel].demand += item.energy_demand;
            f_requirements[category][item.fuel].fuel_input += item.fuel_input;
            data.applianceCarbonCoop.fuel_input_total[category] += item.fuel_input;
        });

        // Add fractions
        for (category in { appliances: {}, cooking: {} }) {
            for (var fuel in f_requirements[category]) {
                f_requirements[category][fuel].fraction =
                    f_requirements[category][fuel].demand /
                    data.applianceCarbonCoop.fuel_input_total[category];
            }
        }
        // Copy over to data.fuel_requirements
        for (var category in f_requirements) {
            data.fuel_requirements[category].quantity =
                data.applianceCarbonCoop.fuel_input_total[category];
            for (fuel in f_requirements[category]) {
                data.fuel_requirements[category].list.push(
                    f_requirements[category][fuel],
                );
            }
        }
    }
}
