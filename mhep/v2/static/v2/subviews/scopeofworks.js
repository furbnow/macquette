console.log('Debug scopeofworks.js');

function scopeofworks_initUI() {
    $('#export_csv').click(function () {
        const assessment = p.data;
        const measures = getMeasures(assessment);
        const formatted = formatMeasures(measures);
        const csv = convertObjectArrayToCSV(formatted);
        downloadCSV(csv, 'measures.csv');
    });
}

function cleanCSVcell(csvCell) {
    let csvCellCleaned = csvCell
        .toString()
        .replace(/\n/g, '')
        .replace(/"/g, '""')
        .trim();
    if (csvCellCleaned.includes(',')) {
        csvCellCleaned = `"${csvCellCleaned}"`;
    }
    return csvCellCleaned;
}

function convertObjectArrayToCSV(objArray) {
    let csv = '';
    for (let i = 0; i < objArray.length; i++) {
        let row = '';
        for (const col in objArray[i]) {
            if (row != '') {
                row += ',';
            }
            const csvCell = objArray[i][col];
            row += cleanCSVcell(csvCell);
        }
        csv += row + '\r\n';
    }
    return csv;
}

function downloadCSV(csv, filename = 'untitled.csv') {
    const downloadData = new Blob([csv], { type: 'text/csv' });
    const downloadLink = document.createElement('a');
    downloadLink.href = window.URL.createObjectURL(downloadData);
    downloadLink.setAttribute('download', filename);
    downloadLink.click();
}

function getScenarioMeasures(scenario, assessment) {
    const scenarioData = assessment[scenario];
    const scenarioMeasures = [];

    function pushedNestedMeasures(measures_by_id) {
        for (const id in measures_by_id) {
            scenarioMeasures.push(measures_by_id[id].measure);
        }
    }

    // Fabric
    if ('measures' in scenarioData.fabric) {
        pushedNestedMeasures(scenarioData.fabric.measures);
    }

    if ('measures' in scenarioData) {
        // Ventilation
        if ('ventilation' in scenarioData.measures) {
            if ('extract_ventilation_points' in scenarioData.measures.ventilation) {
                pushedNestedMeasures(scenarioData.measures.ventilation.extract_ventilation_points);
            }
            if ('intentional_vents_and_flues' in scenarioData.measures.ventilation) {
                pushedNestedMeasures(scenarioData.measures.ventilation.intentional_vents_and_flues);
            }
            if ('intentional_vents_and_flues_measures' in scenarioData.measures.ventilation) {
                pushedNestedMeasures(scenarioData.measures.ventilation.intentional_vents_and_flues_measures);
            }
            if ('draught_proofing_measures' in scenarioData.measures.ventilation) {
                scenarioMeasures.push(scenarioData.measures.ventilation.draught_proofing_measures.measure);
            }
            if ('ventilation_systems_measures' in scenarioData.measures.ventilation) {
                scenarioMeasures.push(scenarioData.measures.ventilation.ventilation_systems_measures.measure);
            }
            if ('clothes_drying_facilities' in scenarioData.measures.ventilation) {
                pushedNestedMeasures(scenarioData.measures.ventilation.clothes_drying_facilities);
            }
        }
    }

    // Water heating
    if ('water_heating' in scenarioData.measures) {
        if ('water_usage' in scenarioData.measures.water_heating) {
            pushedNestedMeasures(scenarioData.measures.water_heating.water_usage);
        }
        if ('storage_type' in scenarioData.measures.water_heating) {
            scenarioMeasures.push(scenarioData.measures.water_heating.storage_type.measure);
        }
        if ('pipework_insulation' in scenarioData.measures.water_heating) {
            scenarioMeasures.push(scenarioData.measures.water_heating.pipework_insulation.measure);
        }
        if ('hot_water_control_type' in scenarioData.measures.water_heating) {
            scenarioMeasures.push(scenarioData.measures.water_heating.hot_water_control_type.measure);
        }
    }
    // Heating controls
    if ('space_heating_control_type' in scenarioData.measures) {
        pushedNestedMeasures(scenarioData.measures.space_heating_control_type);
    }
    // Heating systems
    if ('heating_systems' in scenarioData.measures) {
        pushedNestedMeasures(scenarioData.measures.heating_systems);
    }
    // Generation
    if (scenarioData.use_generation == 1 && 'PV_generation' in scenarioData.measures) {
        scenarioMeasures.push(scenarioData.measures.PV_generation.measure);
    }
    // Lighting
    if ('LAC' in scenarioData.measures) {
        if ('lighting' in scenarioData.measures.LAC) {
            scenarioMeasures.push(scenarioData.measures.LAC.lighting.measure);
        }
    }
    return scenarioMeasures;
}

function getMeasures(assessment) {
    const scenarioListIds = Object.keys(assessment);

    let measures = [];
    for (const scenarioId of scenarioListIds) {
        const scenarioMeasures = getScenarioMeasures(scenarioId, assessment); // cloned in misc.js
        for (let measure of scenarioMeasures) {
            measure.scenario = scenarioId;
        }
        measures = measures.concat(scenarioMeasures);
    }
    return measures;
}

function formatMeasures(measures) {
    let formatted = measures.map((measure) => ({
        scenario: measure.scenario,
        tag: measure.lib || measure.tag,
        name: measure.name,
        location: measure.location || 'Whole house',
        description: measure.description,
        performance: measure.performance,
        key_risks: measure.key_risks,
        maintenance: measure.maintenance,
        associated_work: measure.associated_work,
        notes: measure.notes,
    }));
    const header = {
        scenario: 'Scenario',
        tag: 'Code',
        name: 'Measure',
        location: 'Label/location',
        description: 'Description',
        performance: 'Performance target',
        key_risks: 'Key risks',
        maintenance: 'Maintenance',
        associated_work: 'Associated work',
        notes: 'Special and other considerations',
    };
    formatted.unshift(header); // prepend header row
    return formatted;
}
