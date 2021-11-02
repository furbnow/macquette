/**
* Returns array of objects containing the measures for a given scenario
* @param {any} assessment
* @param {string} scenario
* @return {array}
*/
export function getScenarioMeasures(scenario, assessment) {
    const scenarioData = assessment['data'][scenario];
    const scenarioMeasures = [];

    function pushedNestedMeasures(measures_by_id) {
        for (const id in measures_by_id) {
            scenarioMeasures.push(measures_by_id[id].measure);
        }
    }

    // Fabric
    if ("measures" in scenarioData.fabric) {
        pushedNestedMeasures(scenarioData.fabric.measures);
    }

    if ("measures" in scenarioData) {
        // Ventilation
        if ("ventilation" in scenarioData.measures) {
            if ("extract_ventilation_points" in scenarioData.measures.ventilation) {
                pushedNestedMeasures(scenarioData.measures.ventilation.extract_ventilation_points);
            }
            if ("intentional_vents_and_flues" in scenarioData.measures.ventilation) {
                pushedNestedMeasures(scenarioData.measures.ventilation.intentional_vents_and_flues);
            }
            if ("intentional_vents_and_flues_measures" in scenarioData.measures.ventilation) {
                pushedNestedMeasures(scenarioData.measures.ventilation.intentional_vents_and_flues_measures);
            }
            if ("draught_proofing_measures" in scenarioData.measures.ventilation) {
                scenarioMeasures.push(scenarioData.measures.ventilation.draught_proofing_measures.measure);
            }
            if ("ventilation_systems_measures" in scenarioData.measures.ventilation) {
                scenarioMeasures.push(scenarioData.measures.ventilation.ventilation_systems_measures.measure);
            }
            if ("clothes_drying_facilities" in scenarioData.measures.ventilation) {
                pushedNestedMeasures(scenarioData.measures.ventilation.clothes_drying_facilities);
            }
        }
    }

    // Water heating
    if ("water_heating" in scenarioData.measures) {
        if ("water_usage" in scenarioData.measures.water_heating) {
            pushedNestedMeasures(scenarioData.measures.water_heating.water_usage);
        }
        if ("storage_type" in scenarioData.measures.water_heating) {
            scenarioMeasures.push(scenarioData.measures.water_heating.storage_type.measure);
        }
        if ("pipework_insulation" in scenarioData.measures.water_heating) {
            scenarioMeasures.push(scenarioData.measures.water_heating.pipework_insulation.measure);
        }
        if ("hot_water_control_type" in scenarioData.measures.water_heating) {
            scenarioMeasures.push(scenarioData.measures.water_heating.hot_water_control_type.measure);
        }
    }
    // Heating controls
    if ("space_heating_control_type" in scenarioData.measures) {
        pushedNestedMeasures(scenarioData.measures.space_heating_control_type);
    }
    // Heating systems
    if ("heating_systems" in scenarioData.measures) {
        pushedNestedMeasures(scenarioData.measures.heating_systems);
    }
    // Generation
    if (scenarioData.use_generation == 1 && "PV_generation" in scenarioData.measures) {
        scenarioMeasures.push(scenarioData.measures.PV_generation.measure);
    }
    // Lighting
    if ("LAC" in scenarioData.measures) {
        if ("lighting" in scenarioData.measures.LAC) {
            scenarioMeasures.push(scenarioData.measures.LAC.lighting.measure);
        }
    }
    return scenarioMeasures;
}

/**
* Extracts measures from each scenario in the assessment.
* @param {any} assessment
* @return {array} An array of measures objects.
*/
export function getMeasures(assessment) {
    const scenarioListIds = assessment.getScenarioList({ excludeBase: true }).map(x => x.id);
    let measures = [];
    for (const scenarioId of scenarioListIds) {
        const scenarioMeasures = getScenarioMeasures(scenarioId, assessment) // cloned in misc.js
        for (let measure of scenarioMeasures) {
            measure.scenario = scenarioId
        }
        measures = measures.concat(scenarioMeasures)
    }
    return measures
}

/**
* Formats an array of measures objects by fields required in an export.
* @param {array} measures - An array of measures objects.
* @return {array}
*/
export function formatMeasures(measures) {
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
    formatted.unshift(header) // prepend header row
    return formatted
}

export function addQuantityAndCostToMeasure(measure) {
    // ares of EWI is bigger than the actual area of the wall
    if (measure.cost_units == 'sqm') {
        if (measure.EWI != undefined && measure.EWI == true) {
            measure.area != undefined ? measure.quantity = 1.15 * measure.area : measure.quantity = 0;
        } else {
            // We use measure.area not measure.netarea (See issue 382: https://github.com/emoncms/MyHomeEnergyPlanner/issues/382#event-1681266801)
            measure.area != undefined ? measure.quantity = 1.0 * measure.area : measure.quantity = 0;
        }
    } else if (measure.cost_units == 'ln m') {
        measure.perimeter != undefined ? measure.quantity = 1.0 * measure.perimeter : measure.quantity = 0;
    } else if (measure.cost_units == 'unit') {
        measure.quantity = 1;
    } else {
        measure.quantity = 1;
        measure.cost_units = 'unit';
    }
    if (measure.min_cost != undefined) {
        measure.cost_total = 1.0 * measure.min_cost + 1.0 * measure.quantity * measure.cost;
    } else {
        measure.cost_total = 1.0 * measure.quantity * measure.cost;
    }

    measure.cost_total = 1.0 * measure.cost_total.toFixed(2);
}
