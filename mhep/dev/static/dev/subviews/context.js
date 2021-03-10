function context_UpdateUI() {
    let assessment = new Macquette.Assessment(p, update);
    let scenarioData = assessment.getScenario(scenario);
    Macquette.render(
        Macquette.views.Context,
        {scenario: scenarioData},
        document.querySelector('#content')
    );
}

function context_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
