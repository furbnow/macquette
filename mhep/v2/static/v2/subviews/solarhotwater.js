function solarhotwater_initUI() {
    const element = document.querySelector('#content');
    window.Macquette.uiModules.solarHotWater.init(element, '');
}

function solarhotwater_UpdateUI() {
    window.Macquette.uiModules.solarHotWater.update();
}

function solarhotwater_UnloadUI() {
    window.Macquette.uiModules.solarHotWater.unmountAll();
}
