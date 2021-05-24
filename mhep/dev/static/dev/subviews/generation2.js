function generation2_UpdateUI() {
    Macquette.render(
        Macquette.views.Generation,
        { assessment: p.data, scenarioId: scenario },
        document.querySelector('#content'),
        update,
        libraries
    );
}

function generation2_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
