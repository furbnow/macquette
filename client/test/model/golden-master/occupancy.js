/* eslint-disable */

/*---------------------------------------------------------------------------------------------
 // OCCUPANCY
 //
 // SAP calculation of occupancy based on total floor area
 //
 // Global inputs:
 //      - data.use_custom_occupancy
 //      - data.custom_occupancy
 //      - data.TFA
 //
 // Global outputs:
 //  - data.occupancy
 //--------------------------------------------------------------------------------------------*/

export function legacyOccupancy(data) {
    if (data.use_custom_occupancy == undefined) {
        data.use_custom_occupancy = false;
    }
    if (data.custom_occupancy == undefined) {
        data.custom_occupancy = 1;
    }
    if (data.TFA > 13.9) {
        data.occupancy =
            1 +
            1.76 * (1 - Math.exp(-0.000349 * Math.pow(data.TFA - 13.9, 2))) +
            0.0013 * (data.TFA - 13.9);
    } else {
        data.occupancy = 1;
    }

    if (data.use_custom_occupancy) {
        data.occupancy = data.custom_occupancy;
    }

    return data;
}
