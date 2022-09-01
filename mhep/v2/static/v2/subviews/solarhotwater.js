function solarhotwater_initUI() {
    const element = document.querySelector('#editor__main-content');
    window.Macquette.uiModules.solarHotWater.init(element, '');
}

function solarhotwater_UpdateUI() {
    window.Macquette.uiModules.solarHotWater.update();
}

function solarhotwater_UnloadUI() {
    window.Macquette.uiModules.solarHotWater.unmountAll();
}
