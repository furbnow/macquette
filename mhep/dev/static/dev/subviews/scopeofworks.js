function scopeofworks_UpdateUI() {
    let assessment = new Macquette.Assessment(p, update);

    Macquette.render(
        Macquette.views.ScopeOfWorks,
        { assessment },
        document.querySelector('#content')
    );
}

function scopeofworks_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
