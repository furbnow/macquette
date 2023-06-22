function commentary_initUI() {
    const element = document.querySelector('#react-container');
    window.Macquette.uiModuleShims.commentary.init(element, '');

    let scenarios = [];
    for (let scenario_name in project) {
        if (scenario_name == 'master') {
            continue;
        }
        scenarios.push(scenario_name);
    }
    scenarios.sort();

    for (const s of scenarios) {
        let scenario = project[s];
        $('#overviews').append('<div id="overview-' + s + '" class="overview"></div>');
        load_view('#overview-' + s, 'topgraphic').then(() => {
            $('#overviews #overview-' + s + ' #scenario-name').html(s.charAt(0).toUpperCase() + s.slice(1) + ' - ' + scenario.scenario_name);
            draw_openbem_graphics('#overview-' + s, scenario);
        })
    }

    // commentary belongs to master
    data = project['master'];
}

function commentary_UpdateUI() {
    window.Macquette.uiModuleShims.commentary.update();
}

function commentary_UnloadUI() {
    window.Macquette.uiModuleShims.commentary.unmount();
}
