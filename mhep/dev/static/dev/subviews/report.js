function report_initUI() {
    if (!view_html['compare']) {
        $.ajax({
            url: urlHelper.static('subviews/compare.js'),
            async: false,
            cache: false,
            error: handleServerError('loading subview compare.js'),
        });
    }

    let __report = new Report();
}

class Report {
    constructor() {
        this.element = {
            generateReport: document.querySelector('#generate-report'),
            printReport: document.querySelector('#print-report'),
            reportPreview: document.querySelector('#report-preview'),
            reportPreviewFrame: document.querySelector('iframe'),
        };

        this.get_template();
        this.draw_scenarios();

        this.element.generateReport.addEventListener('click', () => {
            this.element.reportPreview.style.display = 'block';

            let scenarios = [];
            $('#scenario-choices input:checked').each(function () {
                scenarios.push(this.value);
            });

            report_show(
                this.element.reportPreviewFrame.contentDocument.querySelector('body'),
                this.report_template,
                scenarios
            );
        });

        this.element.printReport.addEventListener('click', () => {
            this.element.reportPreviewFrame.contentWindow.focus();
            this.element.reportPreviewFrame.contentWindow.print();
        });
    }

    get_template() {
        mhep_helper.list_organisations()
            .then(orgs => {
                let f = orgs.find(e => e.id == p.organisation.id);
                this.report_template = f.report_template;
            });
    }

    draw_scenarios() {
        let scenarioOpts = '';

        for (let scenarioId of get_scenario_ids(project)) {
            const is_checked = (
                scenarioId === 'master'
                || scenarioId === 'scenario1'
                || scenarioId === 'scenario2'
                || scenarioId === 'scenario3'
            );
            const is_disabled = (scenarioId === 'master');
            const name = (scenarioId === 'master'
                ? project[scenarioId].scenario_name
                : `Scenario ${scenarioId.split('scenario')[1]}: ${project[scenarioId].scenario_name}`);

            scenarioOpts += `
                <li>
                    <input type="checkbox"
                           ${is_checked ? 'checked' : ''}
                           ${is_disabled ? 'disabled' : ''}
                           value="${scenarioId}"
                           class="big-checkbox"
                           id="check-${scenarioId}">
                    <label class="d-i" for="check-${scenarioId}">${name}</label>
                </li>`;
        }

        document.querySelector('#scenario-choices').innerHTML = scenarioOpts;
    }
}
