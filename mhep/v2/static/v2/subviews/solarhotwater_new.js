let uiModule = null;

function solarhotwater_new_initUI() {
    uiModule = Macquette.uiModules.mount('solarHotWater', document.querySelector('#content'));
}

function solarhotwater_new_UpdateUI() {
    uiModule.update();
}

function solarhotwater_new_UnloadUI() {
    uiModule.unload();
}
