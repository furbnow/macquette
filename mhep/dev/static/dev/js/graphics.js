let pageheader_setters = {};

function _house_params() {
    if (!data.fabric) {
        return {};
    }

    return {
        floor: data.fabric.total_floor_WK,
        ventilation: data.ventilation.average_ventilation_WK,
        infiltration: data.ventilation.average_infiltration_WK,
        windows: data.fabric.total_window_WK,
        walls: data.fabric.total_wall_WK,
        roof: data.fabric.total_roof_WK,
        thermalbridge: data.fabric.thermal_bridging_heat_loss,
    };
}

function _targetbars_params() {
    return {
        width: $('#targetbars').width(),
        space_heating_demand: data.space_heating_demand_m2,
        primary_energy: data.primary_energy_use_m2,
        co2: data.kgco2perm2,
        energyuse: data.kwhdpp,
    };
}

function _cost_param() {
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
            house: _house_params(),
            targets: _targetbars_params(),
            cost: _cost_param(),
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
        pageheader_setters.setHouseState(_house_params());
    }

    if (pageheader_setters.setTargetState) {
        pageheader_setters.setTargetState(_targetbars_params());
    }

    if (pageheader_setters.setCost) {
        pageheader_setters.setCost(_cost_param());
    }
}
