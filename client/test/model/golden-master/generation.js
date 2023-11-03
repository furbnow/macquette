/* eslint-disable */
import { datasets } from '../reference-datasets';
let z;

/*---------------------------------------------------------------------------------------------
 // generation
 // Calculates total generation, CO2, primary energy and income from renewables
 //
 //	// Inputs from user:
 //	- data.generation.use_PV_calculator
 //      - data.generation.solar_annual_kwh
 //      - data.generation.solar_fraction_used_onsite
 //      - data.generation.solar_FIT
 //      - data.generation.solar_export_FIT
 //      - data.generation.wind_annual_kwh
 //      - data.generation.wind_fraction_used_onsite
 //      - data.generation.wind_FIT
 //      - data.generation.wind_export_FIT
 //      - data.generation.hydro_annual_kwh: 0, hydro_fraction_used_onsite
 //      - data.generation.hydro_FIT
 //      - data.generation.hydro_export_FIT:
 //      - data.generation.solarpv_orientation // PV calculator: 0 (N) || 1 (NE/NW) || 2 (E/W) || 3 (SE/SW) || 4 (S)
 //      - data.generation.solarpv_kwp_installed // PV calculator
 //      - data.generation.solarpv_inclination // PV calculator, degrees
 //      - data.generation.solarpv_overshading // PV calculator: 0.5 (heavy > 80%) || 0.65 (Significant 60% - 80%) || 0.8 (Modest 20% - 60%) || 1 (None or very little, less than 20%)
 //
 // Inputs from other modules:
 //	- data.fuels['generation']
 //
 // Global Outputs:
 //	- data.total_income
 //
 // Module Variables:
 //      - data.generation.total_generation: 0,
 //      - data.generation.total_used_onsite: 0,
 //      - data.generation.total_exported: 0,
 //      - data.generation.total_CO2: 0
 //.	- data.generation.total_primaryenergy
 //	- data.generation.total_energy_income
 //	- data.generation.systems
 //
 // External functions:
 //	- annual_solar_rad
 //--------------------------------------------------------------------------------------------*/

export function legacyGeneration(data) {
    if (data.generation == undefined) {
        data.generation = {
            solar_annual_kwh: 0,
            solar_fraction_used_onsite: 0.25,
            solar_FIT: 0,
            solar_export_FIT: 0,
            wind_annual_kwh: 0,
            wind_fraction_used_onsite: 0.5,
            wind_FIT: 0,
            wind_export_FIT: 0,
            hydro_annual_kwh: 0,
            hydro_fraction_used_onsite: 0.5,
            hydro_FIT: 0,
            hydro_export_FIT: 0,
            solarpv_orientation: 4,
            solarpv_kwp_installed: 0,
            solarpv_inclination: 35,
            solarpv_overshading: 1,
            total_generation: 0,
            total_used_onsite: 0,
            total_exported: 0,
            total_CO2: 0,
        };
    }
    if (data.generation.systems == undefined) {
        data.generation.systems = {};
    }
    if (data.generation.use_PV_calculator == undefined) {
        data.generation.use_PV_calculator = false;
    }

    if (data.generation.use_PV_calculator != false) {
        let kWp = data.generation.solarpv_kwp_installed;

        // 0:North, 1:NE/NW, 2:East/West, 3:SE/SW, 4:South
        let orient = data.generation.solarpv_orientation;
        let p = data.generation.solarpv_inclination;
        let overshading_factor = data.generation.solarpv_overshading;

        // annual_solar_radiation
        // U3.3 in Appendix U for the applicable climate and orientation and tilt of the PV
        // Z PV is the overshading factor from Table H2.
        // p: tilt
        let annual_solar_radiation = annual_solar_rad(data.region, orient, p);

        data.generation.solar_annual_kwh =
            0.8 * kWp * annual_solar_radiation * overshading_factor;
    }
    // ----------

    data.generation.total_energy_income = 0;
    data.generation.systems = {};
    if (data.generation.solar_annual_kwh > 0) {
        data.generation.systems.solarpv = {
            name: 'Solar PV',
            quantity: data.generation.solar_annual_kwh,
            fraction_used_onsite: data.generation.solar_fraction_used_onsite,
            CO2: data.generation.solar_annual_kwh * data.fuels['generation'].co2factor,
            primaryenergy:
                data.generation.solar_annual_kwh *
                data.fuels['generation'].primaryenergyfactor,
        };
        data.total_income += data.generation.solar_annual_kwh * data.generation.solar_FIT; //income due to generation
        if (data.generation.solar_export_FIT != undefined) {
            data.total_income +=
                0.5 * data.generation.solar_annual_kwh * data.generation.solar_export_FIT;
        } //income due to generation
    }

    if (data.generation.wind_annual_kwh > 0) {
        data.generation.systems.wind = {
            name: 'Wind',
            quantity: data.generation.wind_annual_kwh,
            fraction_used_onsite: data.generation.wind_fraction_used_onsite,
            CO2: data.generation.wind_annual_kwh * data.fuels['generation'].co2factor,
            primaryenergy:
                data.generation.wind_annual_kwh *
                data.fuels['generation'].primaryenergyfactor,
        };
        data.total_income += data.generation.wind_annual_kwh * data.generation.wind_FIT; //income due to generation
        if (data.generation.wind_export_FIT != undefined) {
            data.total_income +=
                0.5 * data.generation.wind_annual_kwh * data.generation.wind_export_FIT;
        } //income due to generation
    }

    if (data.generation.hydro_annual_kwh > 0) {
        data.generation.systems.hydro = {
            name: 'Hydro',
            quantity: data.generation.hydro_annual_kwh,
            fraction_used_onsite: data.generation.hydro_fraction_used_onsite,
            CO2: data.generation.hydro_annual_kwh * data.fuels['generation'].co2factor,
            primaryenergy:
                data.generation.hydro_annual_kwh *
                data.fuels['generation'].primaryenergyfactor,
        };
        data.total_income += data.generation.hydro_annual_kwh * data.generation.hydro_FIT; //income due to generation
        if (data.generation.hydro_export_FIT != undefined) {
            data.total_income +=
                0.5 * data.generation.hydro_annual_kwh * data.generation.hydro_export_FIT;
        } //income due to generation
    }

    data.generation.total_generation = 0;
    data.generation.total_used_onsite = 0;
    data.generation.total_exported = 0;
    data.generation.total_CO2 = 0;
    data.generation.total_primaryenergy = 0;
    for (z in data.generation.systems) {
        data.generation.total_generation += data.generation.systems[z].quantity;
        data.generation.total_used_onsite +=
            data.generation.systems[z].quantity *
            data.generation.systems[z].fraction_used_onsite;
        data.generation.total_CO2 += data.generation.systems[z].CO2;
        data.generation.total_primaryenergy = data.generation.systems[z].primaryenergy;
    }
    data.generation.total_exported =
        data.generation.total_generation - data.generation.total_used_onsite;
    return data;
}

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
