let pageheader_setters = {};

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
        {
            width: document.querySelector('#page-header').clientWidth / 2,
            ...pageheader_state,
        },
        document.getElementById('page-header')
    );
}

function pageheader_resize() {
    if (Object.keys(pageheader_state).length > 0) {
        pageheader_render();
    }
}

function pageheader_new_values({ scenario, scenarioId }) {
    pageheader_state.scenario = scenario;
    pageheader_state.cost = _cost_param(scenarioId);
    pageheader_render();
}

function pageheader_new_page({ page, scenario, scenarioId, totalLock }) {
    pageheader_state.page = page;
    pageheader_state.scenario = scenario;
    pageheader_state.scenarioId = scenarioId;
    pageheader_state.totalLock = totalLock;
    pageheader_state.cost = _cost_param(scenarioId);
    pageheader_render();
}
