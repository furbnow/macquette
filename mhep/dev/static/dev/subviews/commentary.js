console.log('debug commentary.js');

function draw_overview(scenarioId, selector) {
    Macquette.render(
        Macquette.components.Graphics,
        {
            houseData: _house_params(scenarioId),
            targetData: _targetbars_params(scenarioId),
            cost: _cost_param(scenarioId),
        },
        document.querySelector(selector)
    );
}

function commentary_initUI() {
    let scenarios = [];
    for (let scenario_name in project) {
        if (scenario_name == 'master') {
            continue;
        }
        scenarios.push(scenario_name);
    }
    scenarios.sort();

    for (let scenarioId of get_scenario_ids(project)) {
        let scenarioData = project[scenarioId];
        let title = scenarioId.charAt(0).toUpperCase() + scenarioId.slice(1) + ': ' + scenarioData.scenario_name;
        $('#overviews').append(`
            <h3>${title}</h3>
            <div id="overview-${scenarioId}"></div>
        `);
        draw_overview(scenarioId, '#overview-' + scenarioId);
    }

    for (let scenario_name of scenarios) {
        const scenario = project[scenario_name];
        const root = document.importNode(document.getElementById('scenario-template').content, true);

        for (let control of root.querySelectorAll('[key]')) {
            let key = control.getAttribute('key').replace('XXX', scenario_name);
            control.setAttribute('key', key);
        }

        let scenario_num = scenario_name.charAt(8);
        for (let text of root.querySelectorAll('.scenario_num')) {
            text.textContent = scenario_num;
        }

        // We have to set up the initial values because we're not using a key starting
        // with "data.".  We're using "project.XXX" instead, because data is an alias to
        // the current scenario and we want to edit multiple scenarios on the same page.
        // The current "key" attribute setup doesn't allow for this. Luckily, the logic
        // that sets the model value on change works, so we just have to set the initial
        // value manually.
        $(root).find('.scenario_name').val(scenario.scenario_name);
        $(root).find('.scenario_description').val(scenario.scenario_description);

        $(root).insertBefore('#scenario-template');
    }

    // commentary belongs to master
    data = project['master'];
}

function commentary_UnloadUI() {
    // https://gitlab.com/carboncoop/mhep/-/issues/522 was a dataloss bug - if
    // you navigated away from the page using the sidebar before bluring the
    // textarea, its content would be lost.
    // This is a bit of a hack around that.
    $('#openbem textarea').trigger('change');
}
