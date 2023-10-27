/* eslint-disable */
let w, z;
import { datasets } from '../reference-datasets';

/*---------------------------------------------------------------------------------------------
 // BUILDING FABRIC
 //
 // Calculates:
 //      - total monthly fabric heat loss
 //      - monthly solar gains from building elements list
 //
 // Inputs from user:
 //      - data.fabric.elements,
 //      - data.fabric.thermal_bridging_yvalue,
 //      - data.fabric.global_TMP // global thermal mass parameter: true or false
 //      - data.fabric.global_TMP_value
 //
 // Inputs from other modules:
 //      - data.TFA
 //
 // Global Outputs:
 //      - data.TMP,
 //      - data.losses_WK.fabric,
 //      - data.gains_W.solar,
 //      - data.GL
 //      - data.fabric_total_heat_loss_WK
 //
 // Module Variables:
 //      - data.fabric.TMP
 //      - data.fabric.elements[z].netarea
 //      - data.fabric.elements[z].windowarea
 //      - data.fabric.elements[z].wk
 //      - data.fabric.elements[z].gain
 //      - data.fabric.total_external_area
 //      - data.fabric.total_floor_WK
 //      - data.fabric.total_floor_area
 //      - data.fabric.total_wall_WK
 //      - data.fabric.total_wall_area
 //      - data.fabric.total_roof_WK
 //      - data.fabric.total_roof_area
 //      - data.fabric.total_window_WK
 //      - data.fabric.total_window_area
 //      - data.fabric.total_party_wall_WK
 //      - data.fabric.total_party_wall_area
 //      - data.fabric.total_thermal_capacity
 //      - data.fabric.thermal_bridging_heat_loss
 //      - data.fabric.fabric_heat_loss_WK
 //      - data.fabric.total_heat_loss_WK
 //      - data.fabric.annual_solar_gain
 //      - data.fabric.annual_solar_gain_kwh
 //
 // Uses external function:
 //      - calc_solar_gains_from_windows
 //
 // Datasets:
 //      - table_6d_solar_access_factor
 //      - table_6d_light_access_factor
 //
 //---------------------------------------------------------------------------------------------*/

export function legacyFabric(data, solar_acces_factor) {
    if (data.fabric == undefined) {
        data.fabric = {};
    }
    if (data.fabric.elements == undefined) {
        data.fabric.elements = [];
    }
    if (data.fabric.thermal_bridging_yvalue == undefined) {
        data.fabric.thermal_bridging_yvalue = 0.15;
    }
    if (data.fabric.global_TMP == undefined) {
        data.fabric.global_TMP = false;
    }
    if (data.fabric.global_TMP_value == undefined) {
        data.fabric.global_TMP_value = 250;
    } // medium
    if (solar_acces_factor == undefined) {
        solar_acces_factor = 'winter';
    } // solar gains for heating only use 'Winter access factor', while the summer one is used for the calculatin of "Solar gains for cooling and Summer temperatures", table 6d, p. 216 SAP2012
    data.fabric_total_heat_loss_WK = 0;
    data.fabric.total_heat_loss_WK = 0;
    data.fabric.total_thermal_capacity = 0;
    data.fabric.total_floor_WK = 0;
    data.fabric.total_wall_WK = 0;
    data.fabric.total_roof_WK = 0;
    data.fabric.total_window_WK = 0;
    data.fabric.total_party_wall_WK = 0;
    data.fabric.annual_solar_gain = 0;
    data.fabric.total_external_area = 0;
    data.fabric.total_wall_area = 0;
    data.fabric.total_floor_area = 0;
    data.fabric.total_roof_area = 0;
    data.fabric.total_window_area = 0;
    data.fabric.total_party_wall_area = 0;
    // Solar gains
    let sum = 0; // lighting gains
    let gains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Solar gains
    /*var gains_by_orientation = {
     0:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
     1:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
     2:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
     3:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
     4:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
     5:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
     };*/
    for (z in data.fabric.elements) {
        // Calculate heat loss through elements

        // Use element length and height if given rather than area.
        if (
            data.fabric.elements[z]['l'] != undefined &&
            data.fabric.elements[z]['l'] != '' &&
            data.fabric.elements[z]['h'] != undefined &&
            data.fabric.elements[z]['h'] != ''
        ) {
            data.fabric.elements[z].area =
                data.fabric.elements[z]['l'] * data.fabric.elements[z]['h'];
        }
        data.fabric.elements[z].netarea = data.fabric.elements[z].area;
        if (
            data.fabric.elements[z].type != 'window' &&
            data.fabric.elements[z].type != 'Window' &&
            data.fabric.elements[z].type != 'Door' &&
            data.fabric.elements[z].type != 'Roof_light' &&
            data.fabric.elements[z].type != 'Hatch'
        ) {
            data.fabric.elements[z].windowarea = 0;
        }

        // Subtract window areas:

        for (w in data.fabric.elements) {
            if (
                data.fabric.elements[w].type == 'window' ||
                data.fabric.elements[w].type == 'Window' ||
                data.fabric.elements[w].type == 'Door' ||
                data.fabric.elements[w].type == 'Roof_light' ||
                data.fabric.elements[w].type == 'Hatch'
            ) {
                //if (data.fabric.elements[w].subtractfrom != undefined && data.fabric.elements[w].subtractfrom == z)
                if (
                    data.fabric.elements[w].subtractfrom != undefined &&
                    data.fabric.elements[w].subtractfrom == data.fabric.elements[z].id
                ) {
                    let windowarea = data.fabric.elements[w].area;
                    if (
                        data.fabric.elements[w]['l'] != undefined &&
                        data.fabric.elements[w]['l'] != '' &&
                        data.fabric.elements[w]['h'] != undefined &&
                        data.fabric.elements[w]['h'] != ''
                    ) {
                        windowarea =
                            data.fabric.elements[w]['l'] * data.fabric.elements[w]['h'];
                    }
                    data.fabric.elements[z].windowarea += windowarea;
                    data.fabric.elements[z].netarea -= windowarea;
                }
            }
        }

        if (
            data.fabric.elements[z].type == 'window' ||
            data.fabric.elements[z].type == 'Window' ||
            data.fabric.elements[z].type == 'Roof_light'
        ) {
            data.fabric.elements[z].wk =
                data.fabric.elements[z].netarea *
                (1 / (1 / data.fabric.elements[z].uvalue + 0.04));
        } else {
            // SAP assumes we are using curtains: paragraph 3.2, p. 15, SAP2012
            data.fabric.elements[z].wk =
                data.fabric.elements[z].netarea * data.fabric.elements[z].uvalue;
        }
        data.fabric.total_heat_loss_WK += data.fabric.elements[z].wk;
        // By checking that the u-value is not 0 = internal walls we can calculate total external area
        //if (data.fabric.elements[z].uvalue != 0 && data.fabric.elements[z].netarea != undefined) {
        if (
            data.fabric.elements[z].uvalue != 0 &&
            data.fabric.elements[z].type != 'party_wall' &&
            data.fabric.elements[z].type != 'Party_wall'
        ) {
            if (data.fabric.elements[z].netarea == undefined) {
                data.fabric.elements[z].netarea = 0;
            }
            data.fabric.total_external_area += data.fabric.elements[z].netarea;
        }

        if (
            data.fabric.elements[z].type == 'floor' ||
            data.fabric.elements[z].type == 'Floor'
        ) {
            data.fabric.total_floor_WK += data.fabric.elements[z].wk;
            data.fabric.total_floor_area += data.fabric.elements[z].netarea;
        }
        if (
            data.fabric.elements[z].type == 'wall' ||
            data.fabric.elements[z].type == 'Wall'
        ) {
            data.fabric.total_wall_WK += data.fabric.elements[z].wk;
            data.fabric.total_wall_area += data.fabric.elements[z].netarea;
        }
        if (
            data.fabric.elements[z].type == 'roof' ||
            data.fabric.elements[z].type == 'Roof' ||
            data.fabric.elements[z].type == 'Loft'
        ) {
            data.fabric.total_roof_WK += data.fabric.elements[z].wk;
            data.fabric.total_roof_area += data.fabric.elements[z].netarea;
        }
        if (
            data.fabric.elements[z].type == 'window' ||
            data.fabric.elements[z].type == 'Window' ||
            data.fabric.elements[z].type == 'Door' ||
            data.fabric.elements[z].type == 'Roof_light' ||
            data.fabric.elements[z].type == 'Hatch'
        ) {
            data.fabric.total_window_WK += data.fabric.elements[z].wk;
            data.fabric.total_window_area += data.fabric.elements[z].netarea;
        }
        if (
            data.fabric.elements[z].type == 'party_wall' ||
            data.fabric.elements[z].type == 'Party_wall'
        ) {
            data.fabric.total_party_wall_WK += data.fabric.elements[z].wk;
            data.fabric.total_party_wall_area += data.fabric.elements[z].netarea;
        }

        // Calculate total thermal capacity
        if (data.fabric.elements[z].kvalue != undefined) {
            data.fabric.total_thermal_capacity +=
                data.fabric.elements[z].kvalue * data.fabric.elements[z].area;
        }

        if (
            data.fabric.elements[z].type == 'window' ||
            data.fabric.elements[z].type == 'Window' ||
            data.fabric.elements[z].type == 'Door' ||
            data.fabric.elements[z].type == 'Roof_light'
        ) {
            let orientation =
                data.fabric.elements[z]['orientation'] != ''
                    ? data.fabric.elements[z]['orientation']
                    : 0; // For a reason that i haven't been able to find when it is zero, orientation = data.fabric.elements[z]['orientation'] becomes an empty string
            //var orientation = data.fabric.elements[z]['orientation'];
            let area = data.fabric.elements[z]['area'];
            let overshading =
                data.fabric.elements[z]['overshading'] != ''
                    ? data.fabric.elements[z]['overshading']
                    : 0; // For a reason that i haven't been able to find when it is zero, orientation = data.fabric.elements[z]['overshading'] becomes an empty string
            //var overshading = data.fabric.elements[z]['overshading'];
            let g = data.fabric.elements[z]['g'];
            let gL = data.fabric.elements[z]['gL'];
            let ff = data.fabric.elements[z]['ff'];
            let gain = 0;
            // The gains for a given window are calculated for each month
            // the result of which needs to be put in a bin for totals for jan, feb etc..
            for (let month = 0; month < 12; month++) {
                // access factor is time of year dependent
                // Summer months: 5:June, 6:July, 7:August and 8:September (where jan = month 0)
                let summer = 0;
                // solar gains for heating only use 'Winter access factor', while the summer one is used for the calculatin of "Solar gains for cooling and Summer temperatures", table 6d, p. 216 SAP2012
                if (solar_acces_factor == 'summer' && month >= 5 && month <= 8) {
                    summer = 1;
                }
                // According to SAP2012 (p,26 note2) a solar access factor of 1.0 [...] should be used for roof lights, but we think that is not right (see issue 237: https://github.com/emoncms/MyHomeEnergyPlanner/issues/237
                /*if (data.fabric.elements[z].type == 'Roof_light')
                 var access_factor = 1.0;
                 else*/
                let access_factor =
                    datasets.table_6d_solar_access_factor[overshading][summer];
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

                let gain_month =
                    access_factor *
                    area *
                    solar_rad(data.region, orientation, 90, month) *
                    0.9 *
                    g *
                    ff;
                gains[month] += gain_month; // Solar gains
                gain += gain_month;
            }

            // According to SAP2012 (p,26 note2) a solar access factor of 1.0 [...] should be used for roof lights, but we think that is not right (see issue 237: https://github.com/emoncms/MyHomeEnergyPlanner/issues/237
            /*if (data.fabric.elements[z].type == 'Roof_light')
             sum += 0.9 * area * gL * ff * 1.0; // Ligthing gains
             else*/
            sum +=
                0.9 * area * gL * ff * datasets.table_6d_light_access_factor[overshading]; // Ligthing gains
            data.fabric.elements[z].gain = gain / 12.0;
            data.fabric.annual_solar_gain += data.fabric.elements[z].gain;
        }
    }

    data.fabric.thermal_bridging_heat_loss =
        data.fabric.total_external_area * data.fabric.thermal_bridging_yvalue;
    data.fabric.fabric_heat_loss_WK = data.fabric.total_heat_loss_WK;
    data.fabric.total_heat_loss_WK += data.fabric.thermal_bridging_heat_loss;
    data.fabric.annual_solar_gain_kwh = data.fabric.annual_solar_gain * 0.024 * 365;
    if (data.fabric.global_TMP) {
        data.TMP = data.fabric.global_TMP_value;
    } else {
        data.TMP = data.fabric.total_thermal_capacity / data.TFA;
    }
    let monthly_fabric_heat_loss = [];
    for (let m = 0; m < 12; m++) {
        monthly_fabric_heat_loss[m] = data.fabric.total_heat_loss_WK;
    }
    data.fabric_total_heat_loss_WK = data.fabric.total_heat_loss_WK;
    data.losses_WK['fabric'] = monthly_fabric_heat_loss;
    data.gains_W['solar'] = gains;
    data.GL = sum / data.TFA;
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
