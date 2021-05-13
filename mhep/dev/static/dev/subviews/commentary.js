function commentary_UpdateUI() {
    Macquette.render(
        Macquette.views.Commentary,
        { assessment: p.data },
        document.querySelector('#content'),
        update
    );
}

function commentary_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
