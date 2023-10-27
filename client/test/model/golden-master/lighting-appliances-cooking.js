/* eslint-disable */
import { datasets } from '../reference-datasets';

/*---------------------------------------------------------------------------------------------
 // LAC_SAP
 // Calculates heat gains, energy requirements, CO2 emissions and fuel requirements due to lighting,
 // appliances and cooking following SAP worksheets
 //  - Lighting: SAP2012 Anex L1
 //  - Appliances: SAP2012 Anex L2
 //  - Cooking: Anex L3 for heat gains and CO2. SAP2012 doesn't calculate energy requirements for cooking
 //      while OenBEM does it from the CO2 emssions applying a emissioon factor of 0.519 (assuming cooking is done with electricity.
 //
 // Inputs from user:
 //      - data.LAC.L // The total number of fixed lighting outlets
 //	- data.LAC.LLE // The number of fixed low energy lighting outlets
 //	- data.LAC.reduced_heat_gains_lighting
 //	- data.LAC.energy_efficient_appliances
 //	- data.LAC.energy_efficient_cooking
 //
 // Inputs from other modules:
 //	- data.LAC_calculation_type // SAP || carboncoop_SAPlighting || detailedlist
 //      - data.GL
 //	- data.occupancy
 //
 // Global Outputs:
 //	- data.gains_W["Lighting"]
 //	- data.energy_requirements.lighting
 //	- data.fuel_requirements.lighting
 //	- data.TFA
 //	- data.gains_W["Appliances"]
 //	- data.energy_requirements.appliances
 //	- data.fuel_requirements.appliances
 //	- data.gains_W["Cooking"]
 //	- data.energy_requirements.cooking
 //	- data.fuel_requirements.cooking
 //
 // Module Variables:
 //	- data.LAC.EB
 //	- data.LAC.C1
 //	- data.LAC.C2
 //	- data.LAC.EL  	// annual energy lighting
 //	- data.LAC.fuels_lighting
 //	- data.LAC.fuels_appliances
 //	- data.LAC.EA	// annual energy appliances
 //	- data.LAC.EC	// annual energy cooking
 //	- data.LAC.EC_monthly
 //	- data.LAC.GC	// gains cooking
 //
 // Datasets:
 //      - datasets.table_1a
 //
 //---------------------------------------------------------------------------------------------*/
export function legacyLightingAppliancesCooking(data) {
    if (data.LAC == undefined) {
        data.LAC = {};
    }
    if (data.LAC.LLE == undefined) {
        data.LAC.LLE = 1;
    }
    if (data.LAC.L == undefined) {
        data.LAC.L = 1;
    }
    if (data.LAC.energy_efficient_cooking == undefined) {
        data.LAC.energy_efficient_cooking = false;
    }
    if (data.LAC.energy_efficient_appliances == undefined) {
        data.LAC.energy_efficient_appliances = false;
    }
    if (data.LAC.reduced_heat_gains_lighting == undefined) {
        data.LAC.reduced_heat_gains_lighting = false;
    }
    if (data.LAC.fuels_lighting == undefined) {
        data.LAC.fuels_lighting = [{ fuel: 'Standard Tariff', fraction: 1 }];
    }
    if (data.LAC.fuels_cooking == undefined) {
        data.LAC.fuels_cooking = [{ fuel: 'Standard Tariff', fraction: 1 }];
    }
    if (data.LAC.fuels_appliances == undefined) {
        data.LAC.fuels_appliances = [{ fuel: 'Standard Tariff', fraction: 1 }];
    }
    /*  LIGHTING     */
    // average annual energy consumption for lighting if no low-energy lighting is used is:
    data.LAC.EB = 59.73 * Math.pow(data.TFA * data.occupancy, 0.4714);
    if (data.LAC.L != 0) {
        data.LAC.C1 = 1 - (0.5 * data.LAC.LLE) / data.LAC.L;
        data.LAC.C2 = 0;
        if (data.GL <= 0.095) {
            data.LAC.C2 = 52.2 * Math.pow(data.GL, 2) - 9.94 * data.GL + 1.433;
        } else {
            data.LAC.C2 = 0.96;
        }

        data.LAC.EL = data.LAC.EB * data.LAC.C1 * data.LAC.C2;
        let EL_monthly = [];
        let GL_monthly = [];
        let EL_sum = 0;
        for (var m = 0; m < 12; m++) {
            EL_monthly[m] =
                (data.LAC.EL *
                    (1.0 + 0.5 * Math.cos((2 * Math.PI * (m + 1 - 0.2)) / 12.0)) *
                    datasets.table_1a[m]) /
                365.0;
            EL_sum += EL_monthly[m];
            GL_monthly[m] = (EL_monthly[m] * 0.85 * 1000) / (24 * datasets.table_1a[m]);
            if (data.LAC.reduced_heat_gains_lighting) {
                GL_monthly[m] = 0.4 * GL_monthly[m];
            }
        }

        if (
            EL_sum > 0 &&
            (data.LAC_calculation_type == 'SAP' ||
                data.LAC_calculation_type == 'carboncoop_SAPlighting')
        ) {
            data.gains_W['Lighting'] = GL_monthly;
            data.energy_requirements.lighting = {
                name: 'Lighting',
                quantity: EL_sum,
                monthly: EL_monthly,
            };
            var total_fuel_input = 0;
            data.LAC.fuels_lighting.forEach(function (fuel_item) {
                fuel_item.system_efficiency = 1;
                fuel_item.demand =
                    data.energy_requirements.lighting.quantity * fuel_item.fraction;
                fuel_item.fuel_input =
                    (data.energy_requirements.lighting.quantity * fuel_item.fraction) /
                    fuel_item.system_efficiency;
                total_fuel_input += fuel_item.fuel_input;
            });
            data.fuel_requirements.lighting.list = data.LAC.fuels_lighting;
            data.fuel_requirements.lighting.quantity = total_fuel_input;
        }

        /*   if (data.fuel_requirements.lighting == undefined) {
         data.fuel_requirements.lighting = [];
         data.fuel_requirements.lighting[0] = {fuel: 'Standard Tariff', fraction: 1, fuel_input: 0, sytem_efficiency: 1};
         }*/
    }

    /*  Electrical appliances   */

    // The initial value of the annual energy use in kWh for electrical appliances is
    let EA_initial = 207.8 * Math.pow(data.TFA * data.occupancy, 0.4714);
    let EA_monthly = [];
    let GA_monthly = [];
    let EA = 0; // Re-calculated the annual total as the sum of the monthly values
    for (var m = 0; m < 12; m++) {
        // The appliances energy use in kWh in month m (January = 1 to December = 12) is
        EA_monthly[m] =
            (EA_initial *
                (1.0 + 0.157 * Math.cos((2 * Math.PI * (m + 1 - 1.78)) / 12.0)) *
                datasets.table_1a[m]) /
            365.0;
        GA_monthly[m] = (EA_monthly[m] * 1000) / (24 * datasets.table_1a[m]);
        if (data.LAC.energy_efficient_appliances) {
            GA_monthly[m] = 0.67 * GA_monthly[m];
            EA += 0.9 * EA_monthly[m];
        } else {
            EA += EA_monthly[m];
        }
    }

    // The annual CO2 emissions in kg/m2/year associated with electrical appliances is
    let appliances_CO2 = (EA * 0.522) / data.TFA;
    if (EA > 0 && data.LAC_calculation_type == 'SAP') {
        data.gains_W['Appliances'] = GA_monthly;
        data.energy_requirements.appliances = {
            name: 'Appliances',
            quantity: EA,
            monthly: EA_monthly,
        };
        var total_fuel_input = 0;
        data.LAC.fuels_appliances.forEach(function (fuel_item) {
            fuel_item.system_efficiency = 1;
            fuel_item.demand =
                data.energy_requirements.appliances.quantity * fuel_item.fraction;
            fuel_item.fuel_input =
                (data.energy_requirements.appliances.quantity * fuel_item.fraction) /
                fuel_item.system_efficiency;
            total_fuel_input += fuel_item.fuel_input;
        });
        data.fuel_requirements.appliances.list = data.LAC.fuels_appliances;
        data.fuel_requirements.appliances.quantity = total_fuel_input;
    }

    data.LAC.EA = EA;
    /*
     Cooking
     */

    // Internal heat gains in watts from cooking
    let GC = 35 + 7 * data.occupancy;
    // When lower internal heat gains are assumed for the calculation
    if (data.LAC.energy_efficient_cooking) {
        GC = 23 + 5 * data.occupancy;
    }
    let GC_monthly = [];
    for (var m = 0; m < 12; m++) {
        GC_monthly[m] = GC;
    }
    // CO2 emissions in kg/m2/year associated with cooking
    let cooking_CO2 = (119 + 24 * data.occupancy) / data.TFA;

    // We estimate the clculation of annual energy use from the emissions

    if (data.fuels['Standard Tariff'] !== undefined) {
        data.LAC.EC = (cooking_CO2 * data.TFA) / data.fuels['Standard Tariff'].co2factor;
    } else {
        data.LAC.EC = (cooking_CO2 * data.TFA) / 0.519;
    }
    // We stimate the clculation of annual energy use from the emissions
    for (m = 0; m < 12; m++) {
        data.LAC.EC_monthly = data.LAC.EC / 12;
    }
    if (GC > 0 && data.LAC_calculation_type == 'SAP') {
        data.gains_W['Cooking'] = GC_monthly;
        data.energy_requirements.cooking = {
            name: 'Cooking',
            quantity: data.LAC.EC,
            monthly: data.LAC.EC_monthly,
        };
        var total_fuel_input = 0;
        data.LAC.fuels_cooking.forEach(function (fuel_item) {
            fuel_item.system_efficiency = 1;
            fuel_item.demand =
                data.energy_requirements.cooking.quantity * fuel_item.fraction;
            fuel_item.fuel_input =
                (data.energy_requirements.cooking.quantity * fuel_item.fraction) /
                fuel_item.system_efficiency;
            total_fuel_input += fuel_item.fuel_input;
        });
        data.fuel_requirements.cooking.list = data.LAC.fuels_cooking;
        data.fuel_requirements.cooking.quantity = total_fuel_input;
    }

    data.LAC.GC = data.LAC.EC;
    return data;
}
