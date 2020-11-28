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

function pageheader_init() {
    Macquette.render(
        Macquette.views.PageHeader,
        {
            house: _house_params(data),
            targets: _targetbars_params(data),
            cost: _cost_param(scenario),
            callback: (setters) => {
                pageheader_setters = setters;
            },
        },
        document.getElementById('page-header')
    );
}

function pageheader_set_title(title) {
    if (pageheader_setters.setTitle) {
        pageheader_setters.setTitle(title);
    }
}

function pageheader_show_house(show = true) {
    if (pageheader_setters.setShowHouse) {
        pageheader_setters.setShowHouse(show || false);
    }
}

function pageheader_redraw() {
    if (pageheader_setters.setHouseState) {
        pageheader_setters.setHouseState(_house_params(data));
    }

    if (pageheader_setters.setTargetState) {
        pageheader_setters.setTargetState(_targetbars_params(data));
    }

    if (pageheader_setters.setCost) {
        pageheader_setters.setCost(_cost_param());
    }
}
