function draw_openbem_graphics(parent) {
    const root = document.querySelector(`${parent} .house-container`);
    Macquette.render(
        Macquette.components.House,
        {
            floor: data.fabric.total_floor_WK,
            ventilation: data.ventilation.average_ventilation_WK,
            infiltration: data.ventilation.average_infiltration_WK,
            windows: data.fabric.total_window_WK,
            walls: data.fabric.total_wall_WK,
            roof: data.fabric.total_roof_WK,
            thermalbridge: data.fabric.thermal_bridging_heat_loss,
        },
        root,
    );

    draw_space_heating_targetbar(parent, data);
    draw_primary_energy_targetbar(parent, data);
    draw_co2_targetbar(parent, data);
    draw_perperson_targetbar(parent, data);

    if (scenario != undefined) {
        if (page != 'report' && scenario != 'master') {
            $('#measures-costs').html('Measures cost: £' + measures_costs(scenario).toFixed(2));
        } else {
            $('#measures-costs').html('');
        }
    }
}

/*
 * Draw a 'target bar'.
 *
 * name - string to label the graph with
 * unknown - is this value unknown?
 * value - numeric value
 * units - units for value
 * targets - array of objects with "label" and "value" keys, to display on the graph
 */
function targetbarSVG({ width, name, unknown, value, units, targets }) {
    const height = 40;

    // Always 25% larger than max target or value
    const targetValues = targets.map(t => t.value);
    const maxval = Math.max(value, ...targetValues) * 1.25;
    const xscale = width / maxval;

    const header =
        unknown === true
            ? 'Not enough data'
            : `${value} ${units}`;

    const drawLine = target => {
        const x = target.value * xscale;

        return `
            <line x1="${x}" y1="1" x2="${x}" y2="${height-1}" stroke="rgba(99,86,71,0.8)" stroke-dasharray="4.33 4.33" />
            <text x="${x+5}" y="${height-22}" fill="rgba(99,86,71,0.8)">
                ${target.value} ${units}
            </text>
            <text x="${x+5}" y="${height-8}" fill="rgba(99,86,71,0.8)" style="font-weight: bold;">
                ${target.label}
            </text>
        `;
    };

    return `
        <div class='targetbar-head'>
            <span>${name}:</span>
            <span><b>${header}</b></span>
        </div>

        <svg viewBox="0 0 ${width} ${height}" height="${height}">
            <rect x="1" y="1" width="${width-2}" height="${height-2}" style="fill: rgba(99,86,71,0.2); stroke: rgba(99,86,71, 0.5); stroke-width: 2px" />
            <rect x="1" y="1" width="${(value*xscale)-2}" height="${height-2}" fill="rgba(99,86,71,0.2)" />

            ${unknown ? '' : targets.map(drawLine)}
        </svg>
    `;
}

function draw_space_heating_targetbar(parent, data) {
    const is_unknown = isNaN(data.space_heating_demand_m2) || data.space_heating_demand_m2 == Infinity;
    const value =
        is_unknown
            ? 0
            : Math.round(data.space_heating_demand_m2);
    const width = $(`${parent} #spaceheating`).width();

    $(`${parent} #spaceheating`).html(
        targetbarSVG({
            name: 'Space heating demand',
            width: width,
            unknown: is_unknown,
            value: value,
            units: 'kWh/m²',
            targets: [
                //"Passivhaus": 15,
                { label: 'Min target', value: datasets.target_values.space_heating_demand_lower, },
                { label: 'Max target', value: datasets.target_values.space_heating_demand_upper, },
                { label: 'UK Average', value: datasets.uk_average_values.space_heating_demand },
            ]
        })
    );
}

function draw_primary_energy_targetbar(parent, data) {
    const is_unknown = isNaN(data.primary_energy_use_m2) || data.primary_energy_use_m2 === Infinity;
    const value =
        is_unknown
            ? 0
            : Math.round(data.primary_energy_use_m2);
    const width = $(`${parent} #primaryenergy`).width();

    $(`${parent} #primaryenergy`).html(
        targetbarSVG({
            name: 'Primary energy demand',
            width: width,
            unknown: is_unknown,
            value: value,
            units: 'kWh/m²',
            targets: [
                { label: 'Target', value: datasets.target_values.primary_energy_demand_passive_house },
                { label: 'UK Average', value: datasets.uk_average_values.primary_energy_demand },
            ]
        })
    );
}

function draw_co2_targetbar(parent, data) {
    const is_unknown = isNaN(data.kgco2perm2) || data.kgco2perm2 === Infinity;
    const value =
        is_unknown
            ? 0
            : Math.round(data.kgco2perm2);
    const width = $(`${parent} #co2`).width();

    $(`${parent} #co2`).html(
        targetbarSVG({
            name: 'CO2 Emission rate',
            width: width,
            unknown: is_unknown,
            value: value,
            units: 'kgCO₂/m²',
            targets: [
                { label: 'Zero Carbon', value: 0 },
                { label: '80% by 2050', value: 17 },
                { label: 'UK Average', value: datasets.uk_average_values.co2_emission_rate },
            ]
        })
    );
}

function draw_perperson_targetbar(parent, data) {
    const is_unknown = isNaN(data.kwhdpp) || data.kwhdpp === Infinity;
    const value =
        is_unknown
            ? 0
            : Math.round(data.kwhdpp.toFixed(1));
    const width = $(`${parent} #perperson`).width();

    $(`${parent} #perperson`).html(
        targetbarSVG({
            name: 'Per person energy use',
            width: width,
            unknown: is_unknown,
            value: value,
            units: 'kWh/day',
            targets: [
                { label: '70% heating saving', value: datasets.target_values.energy_use_per_person },
                { label: 'UK Average', value: datasets.uk_average_values.energy_use_per_person },
            ]
        })
    );
}
