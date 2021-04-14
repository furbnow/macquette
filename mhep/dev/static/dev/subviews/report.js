function report_initUI() {
    if (!view_html['compare']) {
        $.ajax({
            url: urlHelper.static('subviews/compare.js'),
            async: false,
            cache: false,
            error: handleServerError('loading subview compare.js'),
        });
    }
}

async function report_UpdateUI() {
    let orgs = await mhep_helper.list_organisations();
    let org = orgs.find((e) => e.id == p.organisation.id);
    if (!org) {
        alert("Couldn't find a report template");
    } else {
        template = org.report_template;
    }

    Macquette.render(
        Macquette.views.Report,
        { assessment: p.data, template },
        document.querySelector('#content'),
        update
    );
}

function report_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
