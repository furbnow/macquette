function commentary_UpdateUI() {
    Macquette.render(
        Macquette.views.Commentary,
        {
            assessment: p.data,
            overviewData: Object.fromEntries(
                Macquette.lib.getScenarioList(p.data, true)
                    .map(({ id, num, title }) => [
                        id,
                        {
                            houseData: _house_params(id),
                            targetData: _targetbars_params(id),
                            cost: _cost_param(id),
                        },
                    ])
            ),
        },
        document.querySelector('#content'),
        update
    );
}

function commentary_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
