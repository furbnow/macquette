function report_initUI() {
    draw_scenarios();

    function startFetch() {
        document.getElementById("request-spinner").style.display = "inline-block";
        document.getElementById("request-pdf").disabled = true;
        document.getElementById("request-preview").disabled = true;
    }
    function endFetch() {
        document.getElementById("request-spinner").style.display = "none";
        document.getElementById("request-pdf").disabled = false;
        document.getElementById("request-preview").disabled = false;
    }

    $("#request-pdf").click(async () => {
        startFetch();
        const scenarioIds = getSelectedScenarioIds();
        const context = get_context_data(scenarioIds);
        const graphs = window.Macquette.generateReportGraphs(project, scenarioIds);

        try {
            const pdf = await mhep_helper.generateReport(p.id, {
                context,
                graphs,
            });
            const downloadLink = document.createElement('a');
            downloadLink.href = window.URL.createObjectURL(pdf);
            downloadLink.download = `report_${p.name}.pdf`;
            downloadLink.click();
            endFetch();
        } catch (err) {
            console.log(err);
            endFetch();
        }
    })

    $("#request-preview").click(async () => {
        startFetch();
        const scenarioIds = getSelectedScenarioIds();
        const context = get_context_data(scenarioIds);
        const graphs = window.Macquette.generateReportGraphs(project, scenarioIds);

        try {
            const html = await mhep_helper.generateReportPreview(p.id, {
                context,
                graphs,
            });
            document.querySelector('#report-preview').style.display = 'block';
            document.querySelector('iframe').contentDocument.querySelector('body').innerHTML = html;
            endFetch();
        } catch (err) {
            console.log(err);
            endFetch();
        }
    })
}

function getSelectedScenarioIds() {
    let result = [];
    $('#scenario-choices input:checked').each(function () {
        result.push(this.value);
    });
    return result;
}

function draw_scenarios() {
    let scenarioOpts = '<li><input type="checkbox" checked disabled class="big-checkbox" value="master"> Master</li>';

    for (let scenario_id in project) {
        if (scenario_id == 'master') {
            continue;
        }

        const idx = scenario_id.split('scenario')[1];
        const name = project[scenario_id].scenario_name;

        scenarioOpts += `
            <li>
                <input type="checkbox"
                       checked
                       value="${scenario_id}"
                       class="big-checkbox"
                       id="check-${scenario_id}">
                <label class="d-i" for="check-${scenario_id}">Scenario ${idx}: ${name}</label>
            </li>`;
    }

    document.querySelector('#scenario-choices').innerHTML = scenarioOpts;
}

function get_featured_image() {
    // This or is here because the field name changes after the image gallery has been
    // used. Then it's isFeatured, but until then the server-native format is
    // is_featured. Ick, urgh, etc. Will be unnecessary after this code moves over to
    // TypeScript.
    let featuredImage = p.images.find(e => e.isFeatured || e.is_featured);
    if (featuredImage) {
        return featuredImage.url;
    } else {
        return '';
    }
}

function get_front_address() {
    let address = [
        project.master.household['address_1'] || '',
        project.master.household['address_2'] || '',
        project.master.household['address_3'] || '',
        project.master.household['address_town'] || '',
        project.master.household['address_postcode'] || '',
    ];

    return address.filter(e => e != '').join('\n');
}

function get_priorities() {
    let household = project.master.household;
    let priorities = [
        {
            title: 'Save carbon',
            order: parseInt(household['priority_carbon'], 10)
        },
        {
            title: 'Save money',
            order: parseInt(household['priority_money'], 10),
        },
        {
            title: 'Improve comfort',
            order: parseInt(household['priority_comfort'], 10),
        },
        {
            title: 'Improve indoor air quality',
            order: parseInt(household['priority_airquality'], 10)
        },
        {
            title: 'General modernisation',
            order: parseInt(household['priority_modernisation'], 10),
        },
        {
            title: 'Improve health',
            order: parseInt(household['priority_health'], 10),
        }
    ];

    return priorities
        .filter(elem => !isNaN(elem.order))
        .sort(function (a, b) {
            if (a.order < b.order) {
                return -1;
            } else if (a.order > b.order) {
                return 1;
            } else {
                return 0;
            }
        })
        .map(elem => elem.title)
        .slice(0, 3);
}

function get_average_temperature() {
    temps = [ project.master.household.reading_temp1, project.master.household.reading_temp2 ].filter(e => e ? true : false);
    if (temps.length === 0) {
        return null;
    } else if (temps.length === 1) {
        return temps[0];
    } else {
        return (temps[0] + temps[1]) / 2;
    }
}

function get_average_humidity() {
    temps = [ project.master.household.reading_humidity1, project.master.household.reading_humidity2 ].filter(e => e ? true : false);
    if (temps.length === 0) {
        return null;
    } else if (temps.length === 1) {
        return temps[0];
    } else {
        return (temps[0] + temps[1]) / 2;
    }
}

function get_pv() {
    if (typeof project.master.generation.solar_annual_kwh !== 'number' ||
            project.master.generation.solar_annual_kwh === 0) {
        return false;
    }

    return {
        generation: project.master.generation.solar_annual_kwh, // kWh
        used_onsite: project.master.generation.solar_fraction_used_onsite * 100,  // %
    };
}

function get_current_generation() {
    if (typeof project.master.currentenergy.generation.annual_generation !== 'number' ||
            project.master.currentenergy.generation.annual_generation === 0) {
        return false;
    }

    return {
        kwh: project.master.currentenergy.generation.annual_generation, // kWh
        used_onsite: project.master.currentenergy.generation.fraction_used_onsite * 100,  // %
    };
}

function getUsedFuelNames(scenarioIds) {
    let fuelNames = new Set();

    for (let id of scenarioIds) {
        let scenario = project[id];
        for (let fuel of Object.values(scenario.fuel_totals)) {
            if (fuel.quantity !== 0) {
                fuelNames.add(fuel.name);
            }
        }
    }

    return fuelNames;
}

function getUsedFuels(scenarioIds) {
    let fuelNames = getUsedFuelNames(scenarioIds);
    return [...fuelNames].map(name => ({
        name: name,
        co2factor: project.master.fuels[name].co2factor,
        standingcharge: project.master.fuels[name].standingcharge / 100,
        fuelcost: project.master.fuels[name].fuelcost / 100,
    }));
}

function getAnyScenarioHasBiomass(scenarioIds) {
    let fuelNames = getUsedFuelNames(scenarioIds);
    for (let name of fuelNames) {
        name = name.toLowerCase();
        // Dual fuel appliances can usually take logs or coal - so this
        // is a 'maybe'.
        if (name.includes('wood') || name.includes('dual fuel')) {
            return true;
        }
    }

    return false;
}

function getAnyScenarioHasGeneration(scenarioIds) {
    for (let scenarioId of scenarioIds) {
        let scenario = project[scenarioId];
        if ('generation' in scenario.fuel_totals &&
                scenario.fuel_totals.generation.quantity !== 0) {
            return true;
        }
    }
    return false;
}

function get_scenario_list(scenarios) {
    return scenarios
        .map(id => ({
            id,
            num: id === 'master' ? 0 : parseInt(id.match(/(\d+)/g)[0], 10),
            name: project[id].scenario_name,
            description: project[id].scenario_description,
        }));
}

function get_lookup(table, key) {
    return table[project.master.household[key]];
}

function get_climate_region() {
    let numberToText = {
        0: "UK average",
        1: "Thames",
        2: "South East England",
        3: "Southern England",
        4: "South West England",
        5: "Severn Wales / Severn England",
        6: "Midlands",
        7: "West Pennines Wales / West Pennines England",
        8: "North West England / South West Scotland",
        9: "Borders Scotland / Borders England",
        10: "North East England",
        11: "East Pennines",
        12: "East Anglia",
        13: "Wales",
        14: "West Scotland",
        15: "East Scotland",
        16: "North East Scotland",
        17: "Highland",
        18: "Western Isles",
        19: "Orkney",
        20: "Shetland",
        21: "Northern Ireland",
    }
    return numberToText[project.master.region];
}

function sumArray(arr) {
    return arr.reduce((a, b) => a + b, 0);
}

function get_context_data(scenarios) {
    const hh = project.master.household;

    return {
        front: {
            image_url: get_featured_image(),
            name: hh['householder_name'],
            address: get_front_address(),
            local_authority: hh['address_la'],
            survey_date: hh['assessment_date'],
            report_date: hh['report_date'],
            report_version: hh['report_version'],
            assessor_name: hh['assessor_name'],
            signoff_name: hh['report_signoff'],
        },
        aims: {
            future: {
                occupancy_actual: get_lookup(questionnaire.OCCUPANCY_ACTUAL, 'occupancy_actual'),
                occupancy_planned: get_lookup(questionnaire.OCCUPANCY_EXPECTED, 'occupancy_expected'),
                occupancy_notes: hh['occupancy_expected_note'],
                lifestyle_change: hh['expected_lifestyle_change'] === 'YES',
                lifestyle_change_notes: hh['expected_lifestyle_change_note'],
                other_works: hh['expected_other_works'] === 'YES',
                other_works_notes: hh['expected_other_works_note'],
                works_start: get_lookup(questionnaire.WORKS_START, 'expected_start'),
                works_start_notes: hh['expected_start_note'],
            },
            priorities: get_priorities(),
            qual_criteria: hh['priority_qualitative_note'],
            aesthetics: {
                // true means it's ok to change aesthetics
                internal: hh['aesthetics_external'] === 'NO',
                external: hh['aesthetics_internal'] === 'NO',
                note: hh['aesthetics_note'],
            },
            logistics: {
                packaging: get_lookup(questionnaire.LOGISTICS_PACKAGING, 'logistics_packaging'),
                can_diy: hh['logistics_diy'] === 'YES',
                diy_note: hh['logistics_diy_note'],
                disruption: get_lookup(questionnaire.LOGISTICS_DISRUPTION, 'logistics_disruption'),
                disruption_comment: hh['logistics_disruption_note'],
                has_budget: hh['logistics_budget'] === 'YES',
                budget_comment: hh['logistics_budget_note'],
                brief: hh['commentary_brief'],
            }
        },
        now: {
            climate_region: get_climate_region(),
            occupancy: project.master.occupancy,
            heating: {
                hours_on_weekday: 24 - sumArray(project.master.temperature.hours_off.weekday),
                hours_on_weekend: 24 - sumArray(project.master.temperature.hours_off.weekend),
            },
            home_type: get_lookup(questionnaire.HOUSE_TYPE, 'house_type'),
            num_bedrooms: hh['house_nr_bedrooms'],
            floor_area: project.master.TFA,
            construction: {
                floors: hh['construct_note_floors'],
                walls: hh['construct_note_walls'],
                roof: hh['construct_note_roof'],
                openings: hh['construct_note_openings'],
                drainage: hh['construct_note_drainage'],
                ventiliation: hh['construct_note_ventiliation'],
                ingress: hh['construct_note_ingress'],
            },
            previous_works: hh['previous_works'],
            structural: {
                you_said: hh['structural_issues'],
                we_noted: hh['structural_issues_note'],
            },
            damp: {
                you_said: hh['damp'],
                we_noted: hh['damp_note'],
            },
            space_heating: hh['space_heating_provided'],
            space_heating_controls: hh['space_heating_controls'],
            hot_water: hh['hot_water_provided'],
            utility: {
                electricity: hh['mains_electricity'],
                gas: hh['mains_gas'],
                water: hh['mains_water'],
                sewer: hh['mains_sewer'],
            },
            ventilation: {
                system_name: project.master.ventilation.ventilation_name,
                ventilation_suggestion: get_lookup(questionnaire.VENTILATION_SUGGESTION, 'ventilation_suggestion'),
                avg_humidity: get_average_humidity(),
                adequate_paths: hh['ventilation_adequate_paths'] === 'YES',
                purge_vents: hh['ventilation_purge_vents'] === 'YES',
                gaps: hh['ventilation_gaps'] === 'YES',
                note: hh['ventilation_note'],
                fuel_burner: hh['fuel_burner'],
                fuel_burner_note: hh['fuel_burner_note'],
            },
            laundry_habits: hh['laundry'],
            radon_chance: get_lookup(questionnaire.RADON_RISK, 'radon_risk'),
            experience: {
                thermal: {
                    temperature_winter: hh['comfort_temperature_winter'],
                    temperature_summer: hh['comfort_temperature_summer'],
                    airquality_winter: hh['comfort_airquality_winter'],
                    airquality_summer: hh['comfort_airquality_summer'],
                    draughts_winter: hh['comfort_draughts_winter'],
                    draughts_summer: hh['comfort_draughts_summer'],
                    avg_temp: get_average_temperature(),
                    problems: hh['thermal_comfort_problems'],
                    note: hh['thermal_comfort_note'],
                },
                daylight: {
                    amount: hh['daylight'],
                    problems: hh['daylight_problems'] === 'YES',
                    note: hh['daylight_note'],
                },
                noise: {
                    problems: hh['noise_problems'] === 'YES',
                    note: hh['noise_note'],
                },
                rooms: {
                    favourite: hh['rooms_favourite'],
                    unloved: hh['rooms_unloved'],
                }
            },
            historic: {
                when_built: hh['historic_age_precise']
                    ? hh['historic_age_precise']
                    : get_lookup(questionnaire.HISTORIC_AGE_BAND, 'historic_age_band'),
                conservation: hh['historic_conserved'] === 'YES',
                listed: hh['historic_listed'] === 'NO'
                    ? false
                    : get_lookup(questionnaire.HISTORIC_LISTED, 'historic_listed'),
                comments: hh['historic_note'],
            },
            theworldisburning: {
                flooding_history: hh['flooding_history'] === 'YES',
                flooding_rivers_sea: get_lookup(questionnaire.FLOODING_RISK, 'flooding_rivers_sea'),
                flooding_surface_water: get_lookup(questionnaire.FLOODING_RISK, 'flooding_surface_water'),
                flooding_comments: hh['flooding_note'],
                overheating_comments: hh['overheating_note'],
            },
            context_and_other_points: hh['context_and_other_points'],
            // delete this line post-new report - it contains inaccurate info
            pv: get_pv(),
            generation: get_current_generation(),
        },
        used_fuels: getUsedFuels(scenarios),
        any_scenario_has_generation: getAnyScenarioHasGeneration(scenarios),
        any_scenario_has_biomass: getAnyScenarioHasBiomass(scenarios),
        commentary: {
            brief: hh['commentary_brief'],
            context: hh['commentary_context'],
            decisions: hh['commentary_decisions'],
        },
        scenarios: {
            list: get_scenario_list(scenarios).filter(({id}) => id !== 'master')
        },
        // new - serverside generation only
        // rename to 'scenarios' when deployed
        scenario_data: get_scenario_list(scenarios).map(scenario => Object.assign(
            {},
            scenario,
            {
                created_from: {
                    num: scenario.num === 0 ? -1 :
                        project[scenario.id].created_from === 'master'
                            ? 0
                            : parseInt(project[scenario.id].created_from.split('scenario')[1], 10),
                },
                measures: getScenarioMeasures(project[scenario.id]),
                measures_cost: Math.round(measures_costs(scenario.id) / 10) * 10,
                measures_additive_cost: Math.round(get_additive_cost(scenario.id) / 10) * 10,
                heating_load: window.Macquette.getHeatingLoad(project[scenario.id]),
                target_temp: project[scenario.id].temperature.target,
                co2: {
                    total: project[scenario.id].annualco2,
                    per_person: project[scenario.id].annualco2 / project[scenario.id].occupancy
                },
                heatloss: heatlossData(scenario.id),
            }
        ))
    };
}

function get_additive_cost(scenarioId) {
    let next = project[scenarioId].created_from;
    if (!next || next === 'master') {
        return null;
    }

    let sum = measures_costs(scenarioId);
    while (next && next !== 'master') {
        sum += measures_costs(next);
        next = project[next].created_from;
    }
    return sum;
}

function heatlossData(scenario) {
    if (project[scenario] !== undefined && project[scenario].fabric !== undefined) {
        return {
            floorwk: Math.round(project[scenario].fabric.total_floor_WK),
            ventilationwk: Math.round(project[scenario].ventilation.average_ventilation_WK),
            infiltrationwk: Math.round(project[scenario].ventilation.average_infiltration_WK),
            windowswk: Math.round(project[scenario].fabric.total_window_WK),
            wallswk: Math.round(project[scenario].fabric.total_wall_WK),
            roofwk: Math.round(project[scenario].fabric.total_roof_WK),
            thermalbridgewk: Math.round(project[scenario].fabric.thermal_bridging_heat_loss),
            totalwk: Math.round(project[scenario].fabric.total_floor_WK + project[scenario].ventilation.average_WK + project[scenario].fabric.total_window_WK + project[scenario].fabric.total_wall_WK + project[scenario].fabric.total_roof_WK + project[scenario].fabric.thermal_bridging_heat_loss)
        };
    } else {
        return {
            floorwk: 0,
            ventilationwk: 0,
            infiltrationwk: 0,
            windowswk: 0,
            wallswk: 0,
            roofwk: 0,
            thermalbridgewk: 0,
            totalwk: 0
        };
    }
}
