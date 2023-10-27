/* eslint-disable */
import { datasets } from '../reference-datasets';

/*---------------------------------------------------------------------------------------------
 // SHW  -   Solar Hot Water
 // Calculates annual solar input Q (kWh) from a specific SHW system
 //
 // Inputs from user:
 //      - data.SHW.a1	// Collector linear heat loss coefficient, a1, from test certificate
 //	- data.SHW.a2	// Collector 2nd order heat loss coefficient, a2, from test certificate
 //	- data.SHW.n0	// Zero-loss collector efficiency, η0, from test certificate or Table H1
 //	- data.SHW.orientation
 //	- data.SHW.inclination
 //	- data.SHW.A	// Aperture area of solar collector, m2
 //	- data.SHW.combined_cylinder_volume	// In litres
 //	- data.SHW.Vs	//Dedicated solar storage volume, Vs, (litres)
 //	- data.SHW.volume_ratio	// Volume ratio Veff/Vd,average
 //
 // Inputs from other modules:
 //	- data.region
 //	- data.water_heating.annual_energy_content
 //	- data.water_heating.Vd_average
 //
 // Global Outputs:
 //	- data.SHW.Qs
 //	- data.SHW.Qs_monthly
 //
 // Module Variables:
 //	- data.SHW.a
 //	- data.SHW.collector_performance_ratio
 //	- data.SHW.annual_solar
 //	- data.SHW.solar_energy_available
 //	- data.SHW.solar_load_ratio
 //	- data.SHW.utilisation_factor
 //	- data.SHW.collector_performance_factor
 //	- data.SHW.Veff
 //	- data.SHW.f2
 //
 // Datasets:
 //      - datasets.table_1a
 //
 // Uses external function:
 //      - annual_solar_rad
 //	- solar_rad
 //
 //--------------------------------------------------------------------------------------------*/
export function legacySolarHotWater(data) {
    if (data.SHW == undefined) {
        data.SHW = {};
    }
    /*
     if (data.SHW.A==undefined) data.SHW.A = 1.25;
     if (data.SHW.n0==undefined) data.SHW.n0 = 0.599;
     if (data.SHW.a1==undefined) data.SHW.a1 = 2.772;
     if (data.SHW.a2==undefined) data.SHW.a2 = 0.009;
     if (data.SHW.inclination==undefined) data.SHW.inclination = 35;
     if (data.SHW.orientation==undefined) data.SHW.orientation = 4;
     if (data.SHW.overshading==undefined) data.SHW.overshading = 1.0;
     */
    data.SHW.Qs = 0;
    data.SHW.a = 0.892 * (data.SHW.a1 + 45 * data.SHW.a2);
    data.SHW.collector_performance_ratio = data.SHW.a / data.SHW.n0;
    data.SHW.annual_solar = annual_solar_rad(
        data.region,
        data.SHW.orientation,
        data.SHW.inclination,
    );
    data.SHW.solar_energy_available =
        data.SHW.A * data.SHW.n0 * data.SHW.annual_solar * data.SHW.overshading;
    data.SHW.solar_load_ratio =
        data.SHW.solar_energy_available / data.water_heating.annual_energy_content;
    data.SHW.utilisation_factor = 0;
    if (data.SHW.solar_load_ratio > 0) {
        data.SHW.utilisation_factor = 1 - Math.exp(-1 / data.SHW.solar_load_ratio);
    }
    data.SHW.collector_performance_factor = 0;
    if (data.SHW.collector_performance_ratio < 20) {
        data.SHW.collector_performance_factor =
            0.97 -
            0.0367 * data.SHW.collector_performance_ratio +
            0.0006 * Math.pow(data.SHW.collector_performance_ratio, 2);
    } else {
        data.SHW.collector_performance_factor =
            0.693 - 0.0108 * data.SHW.collector_performance_ratio;
    }
    if (data.SHW.collector_performance_factor < 0) {
        data.SHW.collector_performance_factor = 0;
    }
    data.SHW.Veff = 0;
    if (data.SHW.combined_cylinder_volume > 0) {
        data.SHW.Veff =
            data.SHW.Vs + 0.3 * (data.SHW.combined_cylinder_volume - data.SHW.Vs);
    } else {
        data.SHW.Veff = data.SHW.Vs;
    }

    data.SHW.volume_ratio = data.SHW.Veff / data.water_heating.Vd_average;
    data.SHW.f2 = 1 + 0.2 * Math.log(data.SHW.volume_ratio);
    if (data.SHW.f2 > 1) {
        data.SHW.f2 = 1;
    }
    data.SHW.Qs =
        data.SHW.solar_energy_available *
        data.SHW.utilisation_factor *
        data.SHW.collector_performance_factor *
        data.SHW.f2;
    if (isNaN(data.SHW.Qs) === true) {
        data.SHW.Qs = 0;
    }
    // The solar input (in kWh) for month m is

    let sum = 0;
    for (var m = 0; m < 12; m++) {
        sum += solar_rad(data.region, data.SHW.orientation, data.SHW.inclination, m);
    }
    let annualAverageSolarIrradiance = sum / 12;
    data.SHW.Qs_monthly = [];
    for (m = 0; m < 12; m++) {
        let fm =
            solar_rad(data.region, data.SHW.orientation, data.SHW.inclination, m) /
            annualAverageSolarIrradiance;
        data.SHW.Qs_monthly[m] = (-data.SHW.Qs * fm * datasets.table_1a[m]) / 365;
        if (isNaN(data.SHW.Qs_monthly[m]) === true) {
            data.SHW.Qs_monthly[m] = 0;
        }
    }

    return data;
}

//---------------------------------------------------------------------------------------------
// SEPERATED MODEL FUNCTIONS
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
