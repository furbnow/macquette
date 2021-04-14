function dwellingdata_UpdateUI() {
    let assessment = new Macquette.Assessment(p, update);
    let scenarioData = assessment.getScenario(scenario);
    Macquette.render(
        Macquette.views.DwellingData,
        {assessment: p.data, scenarioId: scenario},
        document.querySelector('#content'),
        update
    );
}

function dwellingdata_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
