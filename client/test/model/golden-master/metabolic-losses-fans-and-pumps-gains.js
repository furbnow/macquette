/* eslint-disable */
let m;

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

export function legacyMetabolicLossesFansAndPumpsGains(data) {
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
        } else if (
            system.central_heating_pump_inside != undefined &&
            system.central_heating_pump_inside !== false
        ) {
            let power = (system.central_heating_pump * 1000) / (24 * 365); // kWh/year to W
            monthly_heat_gains += power;
        }
    });
    // Note: From if there was an oil boiler with pump inside dweling we should add 10W of gains, the problem is that i don't know where in MHEP we can as this. Therefor we assume taht in the case of havin an oil boiler the pump is outside :(

    // From ventilation
    let ventilation_type = '';
    switch (data.ventilation.ventilation_type) {
        case 'NV':
        case 'IE':
        case 'PS':
            ventilation_type = 'd'; // Natural ventilation or whole house positive input ventilation from loft'
            break;
        case 'DEV':
        case 'MEV':
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
        case 'a': //Balanced mechanical ventilation with heat recovery (MVHR), the heat gains in this case are included in the MVHR efficiency
        case 'd': //Positive input ventilation (from loft space)
            // Do nothing
            break;
        case 'c': //Positive input ventilation (from outside) or mechanical extract ventilation
            monthly_heat_gains +=
                2.5 * data.ventilation.system_specific_fan_power * 0.12 * data.volume; // monthly_heat_gains += IUF * SFP *  0.12 *  V;
            break;
        case 'b': //Balanced mechanical ventilation without heat recovery (MV)
            monthly_heat_gains +=
                2.5 * data.ventilation.system_specific_fan_power * 0.06 * data.volume; //monthly_heat_gains += IUF * SFP *  0.06 *  V;
            break;
    }

    for (let i = 0; i < 12; i++) {
        data.gains_W['fans_and_pumps'][i] = monthly_heat_gains;
    }
}
