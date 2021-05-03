function setup_UpdateUI() {
    Macquette.render(
        Macquette.views.Setup,
        {},
        document.querySelector('#content')
    );
}

function setup_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
