function solarhotwater_UpdateUI() {
    let assessment = new Macquette.Assessment(p, update);
    let scenarioData = assessment.getScenario(scenario);
    Macquette.render(
        Macquette.views.SolarHotWater,
        {scenario: scenarioData},
        document.querySelector('#content')
    );
}

function solarhotwater_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
