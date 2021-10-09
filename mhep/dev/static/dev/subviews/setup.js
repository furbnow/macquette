function setup_UpdateUI() {
    Macquette.render(
        Macquette.views.Setup,
        { data: p },
        document.querySelector('#content'),
        update
    );
}

function setup_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
