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

    Macquette.render(
        Macquette.components.TargetBars,
        {
            width: $(`${parent} #targetbars`).width(),
            space_heating_demand: data.space_heating_demand_m2,
            primary_energy: data.primary_energy_use_m2,
            co2: data.kgco2perm2,
            energyuse: data.kwhdpp,
        },
        document.querySelector(`${parent} #targetbars`),
    );

    if (scenario != undefined) {
        if (page != 'report' && scenario != 'master') {
            $('#measures-costs').html('Measures cost: £' + measures_costs(scenario).toFixed(2));
        } else {
            $('#measures-costs').html('');
        }
    }
}
