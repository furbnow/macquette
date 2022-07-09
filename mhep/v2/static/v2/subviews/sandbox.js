function sandbox_initUI() {
    const element = document.querySelector('#content');
    window.Macquette.uiModules.sandbox.init(element, '');
}

function sandbox_UpdateUI() {
    window.Macquette.uiModules.sandbox.update();
}

function sandbox_UnloadUI() {
    window.Macquette.uiModules.sandbox.unmountAll();
}
