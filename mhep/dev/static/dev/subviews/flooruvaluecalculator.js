function saverFn(uvalue, input) {
    console.log(uvalue);
    console.log(input);
}

function flooruvaluecalculator_UpdateUI() {
    Macquette.render(
        Macquette.views.FloorUValueCalculator,
        {saver: saverFn},
        document.querySelector('#content')
    );
}

function flooruvaluecalculator_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
