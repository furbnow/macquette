function ventilationreact_UpdateUI() {
    Macquette.render(
        Macquette.views.Ventilation,
        { assessment: p.data, scenarioId: scenario },
        document.querySelector('#content'),
        update,
        libraries
    );
}

function ventilationreact_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
