function draw_openbem_graphics(parent)
{
    $(`${parent} .house-container`).html(houseSVG(data))

    var targetbarwidth = $(parent + " #targetbars").width();

    $(parent + " #spaceheating").css("width", targetbarwidth);
    $(parent + " #primaryenergy").css("width", targetbarwidth);
    $(parent + " #co2").css("width", targetbarwidth);
    $(parent + " #perperson").css("width", targetbarwidth);

    var targetbarheight = 60;// 0.13 * targetbarwidth;
    if (targetbarheight < 60)
        targetbarheight = 60;
    $(parent + " #spaceheating").css("height", targetbarheight);
    $(parent + " #primaryenergy").css("height", targetbarheight);
    $(parent + " #co2").css("height", targetbarheight);
    $(parent + " #perperson").css("height", targetbarheight);

    // ---------------------------------------------------------------------------------
    var value = '';
    var units = '';
    // ---------------------------------------------------------------------------------
    if (isNaN(data.space_heating_demand_m2) == true) {
        value = 'No data yet';
        units = '';
    }
    else {
        value = Math.round(data.space_heating_demand_m2);
        units = "kWh/m" + String.fromCharCode(178);
    }
    var options = {
        name: "Space heating demand",
        value: value,
        units: units,
        targets: {
            //"Passivhaus": 15,
            "Min target": datasets.target_values.space_heating_demand_lower,
            "Max target": datasets.target_values.space_heating_demand_upper,
            "UK Average": datasets.uk_average_values.space_heating_demand
        }
    };
    targetbar(parent + " #spaceheating", options);
    // ---------------------------------------------------------------------------------
    if (isNaN(data.primary_energy_use_m2) == true) {
        value = 'No data yet';
        units = '';
    }
    else {
        value = Math.round(data.primary_energy_use_m2);
        units = "kWh/m" + String.fromCharCode(178);
    }
    var options = {
        name: "Primary energy demand",
        value: value,
        units: units,
        targets: {
            "Target": datasets.target_values.primary_energy_demand_passive_house,
            "UK Average": datasets.uk_average_values.primary_energy_demand
        }
    };
    targetbar(parent + " #primaryenergy", options);
    // ---------------------------------------------------------------------------------
    if (isNaN(data.kgco2perm2) == true) {
        value = 'No data yet';
        units = '';
    }
    else {
        value = Math.round(data.kgco2perm2);
        units = "kgCO" + String.fromCharCode(8322) + "/m" + String.fromCharCode(178);
    }
    var options = {
        name: "CO2 Emission rate",
        value: value,
        units: units,
        targets: {

            "Zero Carbon": 0,
            "80% by 2050": 17,
            "UK Average": datasets.uk_average_values.co2_emission_rate
        }
    };
    targetbar(parent + " #co2", options);
    // ---------------------------------------------------------------------------------
    if (isNaN(data.kwhdpp) == true) {
        value = 'No data yet';
        units = '';
    }
    else {
        value = Math.round(data.kwhdpp.toFixed(1));
        units = "kWh/day";
    }
    var options = {
        name: "Per person energy use",
        value: value,
        units: units,
        targets: {
            "70% heating saving": datasets.target_values.energy_use_per_person,
            "UK Average": datasets.uk_average_values.energy_use_per_person
        }
    };
    targetbar(parent + " #perperson", options);
    // ---------------------------------------------------------------------------------
    if (scenario != undefined) {
        if (page != 'report' && scenario != 'master')
            $('#measures-costs').html('Measures cost: £' + measures_costs(scenario).toFixed(2));
        else
            $('#measures-costs').html('');
    }
}

function houseSVG(data) {
    const SCALE = 30

    const floorwk = data.fabric.total_floor_WK
    const ventilationwk = data.ventilation.average_ventilation_WK
    const infiltrationwk = data.ventilation.average_infiltration_WK
    const windowswk = data.fabric.total_window_WK
    const wallswk = data.fabric.total_wall_WK
    const roofwk = data.fabric.total_roof_WK
    const thermalbridgewk = data.fabric.thermal_bridging_heat_loss

    const scaled_floor = Math.sqrt(floorwk / SCALE)
    const scaled_ventilation = Math.sqrt(ventilationwk / SCALE)
    const scaled_windows = Math.sqrt(windowswk / SCALE)
    const scaled_walls = Math.sqrt(wallswk / SCALE)
    const scaled_roof = Math.sqrt(roofwk / SCALE)
    const scaled_thermalbridge = Math.sqrt(thermalbridgewk / SCALE)
    const scaled_infiltration = Math.sqrt(infiltrationwk / SCALE)

    const totalwk = floorwk + ventilationwk + infiltrationwk + windowswk + wallswk + roofwk + thermalbridgewk

    return `
        <svg class="house" viewBox="0 0 1040 800" preserveAspectRatio="xMinYMin">
            <defs>
                <g id="house-arrow">
                    <path d="M0 25h65V0l35 50-35 50V75H0z" />
                </g>

                <g id="house-house">
                    <path fill="rgba(99,86,71,.8)" d="M220 100h10v110h-10zM10 140h10v30H10z" />
                    <path fill="rgba(99,86,71,0.8)" d="M120 235h100v-25h10v35H10v-35h10v25zM20 90v10H10V90H0v-5L120 0l120 85v5h-10v10h-10V90L120 20z" />
                    <path fill="rgba(99,86,71,.3)" d="M11 100h8v40h-8zM11 170h8v40h-8z" />
                </g>
            </defs>

            <use xlink:href="#house-house" x="128" y="55" transform="scale(2)" />
            <text x="500" y="400" class="text-bold house--dark" text-anchor="middle">TOTAL</text>
            <text class="house--dark" x="500" y="435" text-anchor="middle">
                ${Math.round(thermalbridgewk)} W/K
            </text>

            <use transform="translate(460,615) rotate(90) scale(${scaled_floor}) translate(0,-50)"
                 xlink:href="#house-arrow"
                 class="house--darker" />
            <text x="540" y="650" class="text-bold house--darker">Floor</text>
            <text class="house--dark" x="540" y="685">
                ${Math.round(floorwk)} W/K
            </text>

            <use transform="translate(645,200) rotate(-55) scale(${scaled_roof}) translate(0,-50)"
                 xlink:href="#house-arrow"
                 class="house--darker" />
            <text x="530" y="50" class="text-bold house--darker">Roof</text>
            <text class="house--dark" x="530" y="85">
                ${Math.round(roofwk)} W/K
            </text>

            <use transform="translate(730,535) rotate(0) scale(${scaled_walls}) translate(0,-50)"
                 xlink:href="#house-arrow"
                 class="house--light" />
            <text x="730" y="650" class="text-bold house--dark">Walls</text>
            <text class="house--dark" x="730" y="685">
                ${Math.round(wallswk)} W/K
            </text>

            <use transform="translate(260,535) rotate(180) scale(${scaled_ventilation}) translate(0,-50)"
                 xlink:href="#house-arrow"
                 class="house--light" />
            <text x="260" y="650" class="text-bold house--dark" text-anchor="end">Ventilation</text>
            <text class="house--dark" x="260" y="685" text-anchor="end">
                ${Math.round(ventilationwk)} W/K
            </text>

            <use transform="translate(260,350) rotate(180) scale(${scaled_windows}) translate(0,-50)"
                 xlink:href="#house-arrow"
                 class="house--light" />
            <text x="260" y="215" class="text-bold house--dark" text-anchor="end">Windows</text>
            <text class="house--dark" x="260" y="250" text-anchor="end">
                ${Math.round(windowswk)} W/K
            </text>

            <use transform="translate(730,350) rotate(0) scale(${scaled_thermalbridge}) translate(0,-50)"
                 xlink:href="#house-arrow"
                 class="house--light" />
            <text x="730" y="210" class="text-bold house--dark">Thermal bridging</text>
            <text class="house--dark" x="730" y="245">
                ${Math.round(thermalbridgewk)} W/K
            </text>

            <use transform="translate(340,205) rotate(235) scale(${scaled_infiltration}) translate(0,-50)"
                 xlink:href="#house-arrow"
                 class="house--darker" />
            <text x="315" y="50" class="text-bold house--darker">Infiltration</text>
            <text class="house--dark" x="315" y="85">
                ${Math.round(infiltrationwk)} W/K
            </text>
        </svg>`
}
