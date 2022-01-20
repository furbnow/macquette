const content = () => document.querySelector('#content');

let uiModule = null;

function sandbox_initUI() {
    uiModule = Macquette.uiModules.mount('sandbox', document.querySelector('#content'));
    // data.counter = 1;
    // content().innerHTML = 'done init'
}

function sandbox_UpdateUI() {
    uiModule.update();
    // content().innerHTML = 'done updateUI ' + data.counter.toString(10)
    // window.setTimeout(() => {
    //     // Do something which modifies data in such a way as to cause UpdateUI to be run again??
    //     data.counter += 1;
    //     update()
    // }, 2000)
}

function sandbox_UnloadUI() {
    uiModule.unload();
    // console.log('done unload, data.counter = ' + data.counter.toString(10))
}
