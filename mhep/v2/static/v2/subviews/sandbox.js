const content = () => document.querySelector('#content');

let uiModule = null;

function sandbox_initUI() {
    uiModule = Macquette.uiModules.mount('sandbox', document.querySelector('#content'));
}

function sandbox_UpdateUI() {
    uiModule.update();
}

function sandbox_UnloadUI() {
    uiModule.unload();
}
