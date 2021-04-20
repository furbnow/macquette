function currentenergy_UpdateUI() {
    Macquette.render(
        Macquette.views.CurrentEnergy,
        {assessment: p.data, scenarioId: scenario},
        document.querySelector('#content'),
        update
    );
}

function currentenergy_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
