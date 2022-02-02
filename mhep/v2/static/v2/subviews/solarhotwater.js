let uiModule = null;

function solarhotwater_initUI() {
    uiModule = Macquette.uiModules.mount('solarHotWater', document.querySelector('#content'));
}

function solarhotwater_UpdateUI() {
    uiModule.update();
}

function solarhotwater_UnloadUI() {
    uiModule.unload();
}
