let pageheader_setters = {};

function _house_params(input) {
    if (!input.fabric) {
        return {};
    }

    return {
        floor: input.fabric.total_floor_WK,
        ventilation: input.ventilation.average_ventilation_WK,
        infiltration: input.ventilation.average_infiltration_WK,
        windows: input.fabric.total_window_WK,
        walls: input.fabric.total_wall_WK,
        roof: input.fabric.total_roof_WK,
        thermalbridge: input.fabric.thermal_bridging_heat_loss,
    };
}

function _targetbars_params(input) {
    let width = $('#targetbars').width() || $('#wrapper').width() / 2;

    return {
        width: width,
        space_heating_demand: input.space_heating_demand_m2,
        primary_energy: input.primary_energy_use_m2,
        co2: input.kgco2perm2,
        energyuse: input.kwhdpp,
    };
}

function _cost_param(scenario) {
    if (scenario !== undefined && scenario !== 'master') {
        return measures_costs(scenario);
    } else {
        return null;
    }
}

let pageheader_state = null;

function pageheader_init() {
    if (!pageheader_state) {
        pageheader_state = {
            title: '',
            showGraphics: true,
            houseData: _house_params(data),
            targetData: _targetbars_params(data),
            cost: _cost_param(scenario),
        };
    }

    Macquette.render(
        Macquette.views.PageHeader,
        pageheader_state,
        document.getElementById('page-header')
    );
}

function pageheader_set_title(title) {
    pageheader_state.title = title;
    pageheader_init();
}

function pageheader_show_graphics(show) {
    pageheader_state.showGraphics = show || false;
    pageheader_init();
}

function pageheader_redraw() {
    pageheader_state.houseData = _house_params(data);
    pageheader_state.targetData = _targetbars_params(data);
    pageheader_state.cost = _cost_param();
    pageheader_init();
}
