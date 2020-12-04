let pageheader_setters = {};

function _house_params(scenarioId) {
    let scenario = project[scenarioId];

    if (!scenario.fabric) {
        return {};
    }

    return {
        floor: scenario.fabric.total_floor_WK,
        ventilation: scenario.ventilation.average_ventilation_WK,
        infiltration: scenario.ventilation.average_infiltration_WK,
        windows: scenario.fabric.total_window_WK,
        walls: scenario.fabric.total_wall_WK,
        roof: scenario.fabric.total_roof_WK,
        thermalbridge: scenario.fabric.thermal_bridging_heat_loss,
    };
}

function _targetbars_params(scenarioId) {
    let scenario = project[scenarioId];
    let width = $('#targetbars').width() || $('#wrapper').width() / 2;

    return {
        width: width,
        space_heating_demand: scenario.space_heating_demand_m2,
        primary_energy: scenario.primary_energy_use_m2,
        co2: scenario.kgco2perm2,
        energyuse: scenario.kwhdpp,
    };
}

function _cost_param(scenarioId) {
    if (scenarioId !== undefined && scenarioId !== 'master') {
        return measures_costs(scenarioId);
    } else {
        return null;
    }
}

let pageheader_state = {};

function pageheader_render() {
    Macquette.render(
        Macquette.views.PageHeader,
        pageheader_state,
        document.getElementById('page-header')
    );
}

function pageheader_resize() {
    if (Object.keys(pageheader_state) > 0) {
        pageheader_render();
    }
}

function pageheader_new_values() {
    pageheader_state.houseData = _house_params(scenario);
    pageheader_state.targetData = _targetbars_params(scenario);
    pageheader_state.cost = _cost_param(scenario);
    pageheader_render();
}

function pageheader_new_page({ title, showGraphics }) {
    pageheader_state.title = title;
    pageheader_state.showGraphics = showGraphics;
    pageheader_state.houseData = _house_params(scenario);
    pageheader_state.targetData = _targetbars_params(scenario);
    pageheader_state.cost = _cost_param(scenario);
    pageheader_render();
}
