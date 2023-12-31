console.log('Debug scopeofworks.js');

function scopeofworks_initUI() {
    $('#export_csv').click(function () {
        const assessment = p.data;
        const output = [
            [
                'Scenario',
                'Code',
                'Measure',
                'Label/location',
                'Performance target',
                'Key risks',
                'Associated work',
                'Maintenance',
            ],
            ...getMeasures(assessment).map(row => [
                row.scenario,
                row.tag,
                row.name,
                row.location,
                row.performance,
                row.key_risks,
                row.associated_work,
                row.maintenance,
            ])
        ];
        const csv = convertNestedArrayToCSV(output);
        downloadCSV(csv, 'measures.csv');
    });

    function get_lookup(table, key) {
        return table[project.master.household[key]];
    }

    $('#export_csv_2').click(function () {
        const outputFields = {
            house_type: questionnaire.HOUSE_TYPE[project.master.household.house_type],
            house_nr_bedrooms: project.master.household.house_nr_bedrooms,
            previous_works: project.master.household.previous_works,
            expected_other_works_note: project.master.household.expected_other_works_note,
            expected_start_note: project.master.household.expected_start_note,
            construct_note_floors: project.master.household.construct_note_floors,
            construct_note_roof: project.master.household.construct_note_roof,
            construct_note_openings: project.master.household.construct_note_openings,
            construct_note_drainage: project.master.household.construct_note_drainage,
            construct_note_ventiliation: project.master.household.construct_note_ventiliation,
            construct_note_walls: project.master.household.construct_note_walls,
            construct_note_ingress: project.master.household.construct_note_ingress,
            structural_issues: project.master.household.structural_issues,
            structural_issues_note: project.master.household.structural_issues_note,
            damp: project.master.household.damp,
            damp_note: project.master.household.damp_note,
            ventilation_adequate_paths: questionnaire.YES_NO_NA[project.master.household.ventilation_adequate_paths],
            ventilation_purge_vents: questionnaire.YES_NO_NA[project.master.household.ventilation_purge_vents],
            ventilation_gaps: questionnaire.YES_NO_NA[project.master.household.ventilation_gaps],
            ventilation_note: project.master.household.ventilation_note,
            ventilation_suggestion: questionnaire.VENTILATION_SUGGESTION[project.master.household.ventilation_suggestion],
            radon_risk: questionnaire.RADON_RISK[project.master.household.radon_risk],
            flooding_rivers_sea: questionnaire.FLOODING_RISK[project.master.household.flooding_rivers_sea],
            flooding_surface_water: questionnaire.FLOODING_RISK[project.master.household.flooding_surface_water],
            flooding_reservoirs: questionnaire.FLOODING_RISK_RESERVOIRS[project.master.household.flooding_reservoirs],
            flooding_history: project.master.household.flooding_history,
            overheating_note: project.master.household.overheating_note,
            historic_age_band: questionnaire.HISTORIC_AGE_BAND[project.master.household.historic_age_band],
            historic_conserved: questionnaire.YES_NO_NA[project.master.household.historic_conserved],
            historic_listed: questionnaire.HISTORIC_LISTED[project.master.household.historic_listed],
            context_and_other_points: project.master.household.context_and_other_points,
            TFA: project.master.TFA,
            ventilation_type: project.master.ventilation.ventilation_type,
            ventilation_name: project.master.ventilation.ventilation_name,
        };
        const cells = [
            Object.keys(outputFields).map(cleanCSVcell),
            Object.values(outputFields).map(r => r || '').map(cleanCSVcell),
        ];
        const csv = cells[0].join(',') + '\n' + cells[1].join(',');
        downloadCSV(csv, 'scopeofworks.csv');
    });
}

function cleanCSVcell(csvCell) {
    let csvCellCleaned = csvCell
        .toString()
        .replace(/\s+/g, ' ')
        .replace(/"/g, '""')
        .trim();
    return `"${csvCellCleaned}"`;
}

// cleanCSVcell('This  has    many  spaces') === '"This has many spaces"'
// cleanCSVcell('\n') === '""'
// cleanCSVcell('"Right said Fred"') === '"""Right said Fred"""'

function convertNestedArrayToCSV(input) {
    return input.map(row => row.map(cleanCSVcell).join(",")).join("\r\n") + "\r\n";
}

function downloadCSV(csv, filename = 'untitled.csv') {
    const downloadData = new Blob([csv], { type: 'text/csv' });
    const downloadLink = document.createElement('a');
    downloadLink.href = window.URL.createObjectURL(downloadData);
    downloadLink.setAttribute('download', filename);
    downloadLink.click();
}

function getMeasures(assessment) {
    const scenarioIds = getScenarioIds({ project, excludeBase: true });
    let measures = [];
    for (const scenarioId of scenarioIds) {
        const scenarioMeasures = getScenarioMeasures(assessment[scenarioId]);
        for (let measure of scenarioMeasures) {
            measure.scenario = scenarioId;
        }
        measures = measures.concat(scenarioMeasures);
    }
    return measures;
}
