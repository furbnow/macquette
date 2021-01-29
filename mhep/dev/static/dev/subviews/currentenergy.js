function currentenergy_UpdateUI() {
    let assessment = new Macquette.Assessment(p, update);
    let scenarioData = assessment.getScenario(scenario);
    Macquette.render(
        Macquette.views.CurrentEnergy,
        {scenario: scenarioData},
        document.querySelector('#content')
    );
}

function currentenergy_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
