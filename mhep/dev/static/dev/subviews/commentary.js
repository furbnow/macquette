function commentary_initUI() {
    let assessment = new Macquette.Assessment(p, update);
    Macquette.render(
        Macquette.views.Commentary,
        {
            assessment,
            overviewData: assessment
                .getScenarioList({ excludeBase: true })
                .map(({ id, num, title }) => ({
                    id,
                    num,
                    title,
                    houseData: _house_params(id),
                    targetData: _targetbars_params(id),
                    cost: _cost_param(id),
                })),
        },
        document.querySelector('#content')
    );
}

function commentary_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
