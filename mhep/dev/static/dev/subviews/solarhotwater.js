function solarhotwater_UpdateUI() {
    Macquette.render(
        Macquette.views.SolarHotWater,
        {assessment: p.data, scenarioId: scenario},
        document.querySelector('#content'),
        update
    );
}

function solarhotwater_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
