/* eslint-disable */

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

export function legacyCurrentEnergy (data) {
    if (data.currentenergy == undefined) {
        data.currentenergy = {};
    }
    if (data.currentenergy.use_by_fuel == undefined) {
        data.currentenergy.use_by_fuel = {};
    }
    if (data.currentenergy.generation == undefined) {
        data.currentenergy.generation = {
            annual_generation: 0,
            annual_CO2: 0,
            primaryenergy: 0,
            annual_savings: 0,
            fraction_used_onsite: 0.25,
            annual_FIT_income: 0,
        };
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
            f_use.annualcost =
                (f_use.annual_use * data.fuels[fuel].fuelcost) / 100 +
                data.fuels[fuel].standingcharge;
        } else {
            f_use.annualcost = 0;
        }

        // Calculation of totals
        total_co2 += f_use.annual_co2;
        total_cost += f_use.annualcost;
        primaryenergy_annual_kwh += f_use.primaryenergy;
        enduse_annual_kwh += f_use.annual_use;
    }

    if (data.currentenergy.onsite_generation === 1) {
        // See issue 304
        // Add to the totals the amount of energy generated that was used onsite
        enduse_annual_kwh +=
            data.currentenergy.generation.fraction_used_onsite *
            data.currentenergy.generation.annual_generation;
        primaryenergy_annual_kwh +=
            data.fuels.generation.primaryenergyfactor *
            data.currentenergy.generation.fraction_used_onsite *
            data.currentenergy.generation.annual_generation;
        total_co2 +=
            data.fuels.generation.co2factor *
            data.currentenergy.generation.fraction_used_onsite *
            data.currentenergy.generation.annual_generation;

        // Calculate generation totals (savings due to generation)
        data.currentenergy.generation.primaryenergy =
            data.fuels.generation.primaryenergyfactor *
            data.currentenergy.generation.annual_generation;
        data.currentenergy.generation.annual_CO2 =
            data.fuels.generation.co2factor *
            data.currentenergy.generation.annual_generation;
        data.currentenergy.generation.annual_savings =
            (data.fuels.generation.fuelcost / 100) *
            data.currentenergy.generation.fraction_used_onsite *
            data.currentenergy.generation.annual_generation;

        // Calculate totals taking into account generation
        total_co2 -= data.currentenergy.generation.annual_CO2;
        primaryenergy_annual_kwh -= data.currentenergy.generation.primaryenergy;
        // total_cost -= data.currentenergy.generation.annual_savings; -- Annual savings are not added: this is moeny that the user would pay on top of what they already pay if they didn't have generation
    }

    data.currentenergy.primaryenergy_annual_kwh = primaryenergy_annual_kwh;
    data.currentenergy.total_co2 = total_co2;
    data.currentenergy.total_cost = total_cost;
    data.currentenergy.annual_net_cost =
        total_cost - data.currentenergy.generation.annual_FIT_income;
    data.currentenergy.primaryenergy_annual_kwhm2 = primaryenergy_annual_kwh / data.TFA;
    data.currentenergy.total_co2m2 = total_co2 / data.TFA;
    data.currentenergy.total_costm2 = total_cost / data.TFA;
    data.currentenergy.energyuseperperson = enduse_annual_kwh / 365.0 / data.occupancy;
    data.currentenergy.enduse_annual_kwh = enduse_annual_kwh;
    data.currentenergy.enduse_annual_kwhm2 = enduse_annual_kwh / data.TFA;

    return data;
};
