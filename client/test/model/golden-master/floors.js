/* eslint-disable */
let z;

/*---------------------------------------------------------------------------------------------
 // FLOORS
 //
 // Inputs from user:
 //      - data.floors
 //
 // Global Outputs:
 //      - data.TFA
 //      - data.volume
 //      - data.num_of_floors
 //--------------------------------------------------------------------------------------------*/

export function legacyFloors(data) {
    if (data.floors == undefined) {
        data.floors = [];
    }
    for (z in data.floors) {
        data.floors[z].volume = data.floors[z].area * data.floors[z].height;
        data.TFA += data.floors[z].area;
        data.volume += data.floors[z].volume;
        data.num_of_floors++;
    }

    return data;
}
