var view_html = {};

async function requireJs(url) {
    return new Promise((resolve, reject) => {
        var scriptElem = document.createElement('script');
        scriptElem.src = url;

        scriptElem.onload = () => resolve();
        scriptElem.onerror = () => reject();

        document.head.appendChild(scriptElem);
    });
}

async function subview(viewName) {
    const url = staticFileResolver.resolve('subviews/' + viewName + '.html');
    if (!url) {
        throw new Error(
            `Couldn't find URL for 'subviews/${viewName}.html' ` +
                '(if you are running the code locally, this could be because you' +
                ' added a new page without running collectstatic)',
        );
    }

    let response;
    try {
        response = await fetch(url);
    } catch (err) {
        console.error('Error loading subview', viewName, err);
        alert(`Error loading page ${viewName}`);
        throw err;
    }

    if (!response.ok) {
        const msg = `Error loading subview: server returned ${response.status} (${response.statusText})`;
        console.error(msg, viewName, err, response);
        alert(msg);
        throw new Error(msg);
    }

    return response.text();
}

async function load_view(rootElem, viewName) {
    if (viewName in view_html) {
        $(rootElem).html(view_html[viewName]);
        return;
    }

    const html = await subview(viewName);

    $(rootElem).html(html);
    view_html[viewName] = html;

    // We have to load the HTML and then the JS sequentially due to legacy assumptions
    await requireJs(staticFileResolver.resolve('subviews/' + viewName + '.js'));
};

function varset(key, value) {
    var lastval = '';
    var p = key.split('.');

    switch (p.length) {
        case 0:
            break;
        case 1:
            try {
                lastval = window[p[0]];
            } catch (err) {
                throw new Error(`Failed to get window[${p[0]}]`);
            }
            try {
                window[p[0]] = value;
            } catch (err) {
                throw new Error(`Failed to set window[${p[0]}]`);
            }
            break;
        case 2:
            try {
                lastval = window[p[0]][p[1]];
            } catch (err) {
                throw new Error(`Failed to get window.${p[0]}.${p[1]}`);
            }
            try {
                window[p[0]][p[1]] = value;
            } catch (err) {
                throw new Error(`Failed to set window.${p[0]}.${p[1]}`);
            }
            break;
        case 3:
            try {
                lastval = window[p[0]][p[1]][p[2]];
            } catch (err) {
                throw new Error(`Failed to get window.${p[0]}.${p[1]}.${p[2]}`);
            }
            try {
                window[p[0]][p[1]][p[2]] = value;
            } catch (err) {
                throw new Error(`Failed to set window.${p[0]}.${p[1]}.${p[2]}`);
            }
            break;
        case 4:
            try {
                lastval = window[p[0]][p[1]][p[2]][p[3]];
            } catch (err) {
                throw new Error(`Failed to get window.${p[0]}.${p[1]}.${p[2]}.${p[3]}`);
            }
            try {
                window[p[0]][p[1]][p[2]][p[3]] = value;
            } catch (err) {
                throw new Error(`Failed to set window.${p[0]}.${p[1]}.${p[2]}.${p[3]}`);
            }
            break;
        case 5:
            try {
                lastval = window[p[0]][p[1]][p[2]][p[3]][p[4]];
            } catch (err) {
                throw new Error(`Failed to get window.${p[0]}.${p[1]}.${p[2]}.${p[3]}.${p[4]}`);
            }
            try {
                window[p[0]][p[1]][p[2]][p[3]][p[4]] = value;
            } catch (err) {
                throw new Error(`Failed to set window.${p[0]}.${p[1]}.${p[2]}.${p[3]}.${p[4]}`);
            }
            break;
        case 6:
            try {
                lastval = window[p[0]][p[1]][p[2]][p[3]][p[4]][p[5]];
            } catch (err) {
                throw new Error(`Failed to get window.${p[0]}.${p[1]}.${p[2]}.${p[3]}.${p[4]}.${p[5]}`);
            }
            try {
                window[p[0]][p[1]][p[2]][p[3]][p[4]][p[5]] = value;
            } catch (err) {
                throw new Error(`Failed to set window.${p[0]}.${p[1]}.${p[2]}.${p[3]}.${p[4]}.${p[5]}`);
            }
            break;
    }
    return lastval;
}

function varget(key) {
    var p = key.split('.');
    var val = false;

    switch (p.length) {
        case 0:
            break;
        case 1:
            try {
                val = window[p[0]];
            } catch (err) {
            }
            break;
        case 2:
            try {
                val = window[p[0]][p[1]];
            } catch (err) {
            }
            break;
        case 3:
            try {
                val = window[p[0]][p[1]][p[2]];
            } catch (err) {
            }
            break;
        case 4:
            try {
                val = window[p[0]][p[1]][p[2]][p[3]];
            } catch (err) {
            }
            break;
        case 5:
            try {
                val = window[p[0]][p[1]][p[2]][p[3]][p[4]];
            } catch (err) {
            }
            break;
        case 6:
            try {
                val = window[p[0]][p[1]][p[2]][p[3]][p[4]][p[5]];
            } catch (err) {
            }
            break;
    }
    return val;
}

function legacy_update_page_from_data() {
    getkeys('data', data);

    let elems = document.querySelectorAll('[key]');
    for (let elem of elems) {
        let key = elem.getAttribute('key');
        if (keys[key] !== undefined) {
            let value = keys[key];
            let target = $(elem);
            let dp = 1 * target.attr('dp');
            let units = target.attr('units');

            if (!isNaN(dp)) {
                value = (1 * value).toFixed(dp);
            }

            if (units != undefined) {
                value += '' + units;
            }

            if (target.is('span')) {
                target.html(value);
            } else if (target.is('input[type=text]')) {
                target.val(value);
            } else if (target.is('input[type=number]')) {
                target.val(value);
            } else if (target.is('input[type=checkbox]')) {
                target.prop('checked', value);
            } else if (target.is('input[type=hidden]')) {
                target.val(value);
            } else if (target.is('input[type=radio]')) {
                // Purposeful loose equals, because e.value will always be a string
                // while 'value' might an integer... but "3" == 3 so who cares
                let found = target.filter((_, e) => e.value == value);
                if (found.length) {
                    found[0].checked = true;
                }
            } else if (target.is('textarea')) {
                target.html(value);
            } else if (target.is('select')) {
                target.val(value);
            } else if (target.is('td')) {
                target.html(value);
            } else if (target.is('th')) {
                target.html(value);
            } else if (target.is('div')) {
                target.html(value);
            } else {
                console.error('Unhandled type for keys');
            }
        }
    }
}

function getkeys(key, val) {
    switch (typeof val) {
        case 'object':
            for (subkey in val) {
                getkeys(key + '.' + subkey, val[subkey]);
            }
            break;
        case 'string':
            keys[key] = val;
            break;
        case 'number':
            keys[key] = val;
            break;
        case 'boolean':
            keys[key] = val;
            break;
    }
}

function getuikeys() {
    var uikeys = [];
    $('[key]').each(function () {
        uikeys.push($(this).attr('key'));
    });
    return uikeys;
}

Object.size = function (obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            size++;
        }
    }
    return size;
};

function get_fuels_for_select(category_to_show) {
    // Group fuels by category
    var fuels_by_category = {};
    for (var fuel in data.fuels) {
        var category = data.fuels[fuel].category;
        if (fuels_by_category[category] == undefined) {
            fuels_by_category[category] = [];
        }
        fuels_by_category[category].push(fuel);
    }

    // Generate output string according to the category passed to the function, if the category exist we return optionns for that category, if it doesn't exist we return all the fuel sorted by category
    var options = '';
    if (fuels_by_category[category_to_show] != undefined) {
        for (fuel in data.fuels) {
            if (data.fuels[fuel].category == category_to_show) {
                options += '<option value="' + fuel + '">' + fuel + '</option>';
            }
        }
    } else {
        for (category in fuels_by_category) {
            if (category != 'generation') {
                options += '<optgroup label="' + category + '">';
                for (index in fuels_by_category[category]) {
                    options += '<option value="' + fuels_by_category[category][index] + '">' + fuels_by_category[category][index] + '</option>';
                }
                options += '</optgroup>';
            }
        }
    }
    return options;
}

function get_a_fuel(type_of_fuel) { // Returns the first fuel for a specific type found in data.fuels for a specific type
    for (var fuel in data.fuels) {
        if (data.fuels[fuel].category == type_of_fuel) {
            return fuel;
        }
    }
}

function get_fuel_categories() {
    var categories = [];
    for (var fuel in project.master.fuels) {
        if (categories.indexOf(project.master.fuels[fuel].category) === -1) {
            categories.push(project.master.fuels[fuel].category);
        }
    }
    return categories;
}


/************************
 **  Hours off
 ************************/
function get_hours_off_weekday(data) {
    var hours_off = [];
    if (project.master.household['heating_weekday_off3_hours'] != undefined
            && project.master.household['heating_weekday_off3_mins'] != undefined
            && (project.master.household['heating_weekday_on3_hours'] != project.master.household['heating_weekday_off3_hours']
                    || project.master.household['heating_weekday_on3_mins'] != project.master.household['heating_weekday_off3_mins'])) {
        var time_on_1 = new Date(2000, 1, 1, project.master.household['heating_weekday_on1_hours'], project.master.household['heating_weekday_on1_mins'], 0, 0);
        var time_off_1 = new Date(2000, 1, 1, project.master.household['heating_weekday_off1_hours'], project.master.household['heating_weekday_off1_mins'], 0, 0);
        var time_on_2 = new Date(2000, 1, 1, project.master.household['heating_weekday_on2_hours'], project.master.household['heating_weekday_on2_mins'], 0, 0);
        var time_off_2 = new Date(2000, 1, 1, project.master.household['heating_weekday_off2_hours'], project.master.household['heating_weekday_off2_mins'], 0, 0);
        var time_on_3 = new Date(2000, 1, 1, project.master.household['heating_weekday_on3_hours'], project.master.household['heating_weekday_on3_mins'], 0, 0);
        var time_off_3 = new Date(2000, 1, 1, project.master.household['heating_weekday_off3_hours'], project.master.household['heating_weekday_off3_mins'], 0, 0);
        hours_off = (get_hours_three_periods(time_on_1, time_off_1, time_on_2, time_off_2, time_on_3, time_off_3));

    } else if (project.master.household['heating_weekday_off2_hours'] != undefined
            && project.master.household['heating_weekday_off2_mins'] != undefined
            && (project.master.household['heating_weekday_on2_hours'] != project.master.household['heating_weekday_off2_hours']
                    || project.master.household['heating_weekday_on2_mins'] != project.master.household['heating_weekday_off2_mins'])) {
        var time_on_1 = new Date(2000, 1, 1, project.master.household['heating_weekday_on1_hours'], project.master.household['heating_weekday_on1_mins'], 0, 0);
        var time_off_1 = new Date(2000, 1, 1, project.master.household['heating_weekday_off1_hours'], project.master.household['heating_weekday_off1_mins'], 0, 0);
        var time_on_2 = new Date(2000, 1, 1, project.master.household['heating_weekday_on2_hours'], project.master.household['heating_weekday_on2_mins'], 0, 0);
        var time_off_2 = new Date(2000, 1, 1, project.master.household['heating_weekday_off2_hours'], project.master.household['heating_weekday_off2_mins'], 0, 0);
        hours_off = (get_hours_two_periods(time_on_1, time_off_1, time_on_2, time_off_2));
    } else if (project.master.household['heating_weekday_off1_hours'] != project.master.household['heating_weekday_on1_hours'] || project.master.household['heating_weekday_off1_mins'] != project.master.household['heating_weekday_on1_mins']) {
        var time_off = new Date(2000, 1, 1, project.master.household['heating_weekday_off1_hours'], project.master.household['heating_weekday_off1_mins'], 0, 0);
        var time_on = new Date(2000, 1, 1, project.master.household['heating_weekday_on1_hours'], project.master.household['heating_weekday_on1_mins'], 0, 0);
        hours_off.push(get_hours_off_one_period(time_on, time_off));
    } else {
        hours_off.push(0);
    }
    return hours_off;
}
function get_hours_off_weekend(data) {
    var hours_off = [];
    if (project.master.household['heating_weekend_off3_hours'] != undefined
            && project.master.household['heating_weekend_off3_mins'] != undefined
            && (project.master.household['heating_weekend_on3_hours'] != project.master.household['heating_weekend_off3_hours']
                    || project.master.household['heating_weekend_on3_mins'] != project.master.household['heating_weekend_off3_mins'])) {
        var time_on_1 = new Date(2000, 1, 1, project.master.household['heating_weekend_on1_hours'], project.master.household['heating_weekend_on1_mins'], 0, 0);
        var time_off_1 = new Date(2000, 1, 1, project.master.household['heating_weekend_off1_hours'], project.master.household['heating_weekend_off1_mins'], 0, 0);
        var time_on_2 = new Date(2000, 1, 1, project.master.household['heating_weekend_on2_hours'], project.master.household['heating_weekend_on2_mins'], 0, 0);
        var time_off_2 = new Date(2000, 1, 1, project.master.household['heating_weekend_off2_hours'], project.master.household['heating_weekend_off2_mins'], 0, 0);
        var time_on_3 = new Date(2000, 1, 1, project.master.household['heating_weekend_on3_hours'], project.master.household['heating_weekend_on3_mins'], 0, 0);
        var time_off_3 = new Date(2000, 1, 1, project.master.household['heating_weekend_off3_hours'], project.master.household['heating_weekend_off3_mins'], 0, 0);
        hours_off = (get_hours_three_periods(time_on_1, time_off_1, time_on_2, time_off_2, time_on_3, time_off_3));

    } else if (project.master.household['heating_weekend_off2_hours'] != undefined
            && project.master.household['heating_weekend_off2_mins'] != undefined
            && (project.master.household['heating_weekend_on2_hours'] != project.master.household['heating_weekend_off2_hours']
                    || project.master.household['heating_weekend_on2_mins'] != project.master.household['heating_weekend_off2_mins'])) {
        var time_on_1 = new Date(2000, 1, 1, project.master.household['heating_weekend_on1_hours'], project.master.household['heating_weekend_on1_mins'], 0, 0);
        var time_off_1 = new Date(2000, 1, 1, project.master.household['heating_weekend_off1_hours'], project.master.household['heating_weekend_off1_mins'], 0, 0);
        var time_on_2 = new Date(2000, 1, 1, project.master.household['heating_weekend_on2_hours'], project.master.household['heating_weekend_on2_mins'], 0, 0);
        var time_off_2 = new Date(2000, 1, 1, project.master.household['heating_weekend_off2_hours'], project.master.household['heating_weekend_off2_mins'], 0, 0);
        hours_off = (get_hours_two_periods(time_on_1, time_off_1, time_on_2, time_off_2));
    } else if (project.master.household['heating_weekend_off1_hours'] != project.master.household['heating_weekend_on1_hours'] || project.master.household['heating_weekend_off1_mins'] != project.master.household['heating_weekend_on1_mins']) {
        var time_off = new Date(2000, 1, 1, project.master.household['heating_weekend_off1_hours'], project.master.household['heating_weekend_off1_mins'], 0, 0);
        var time_on = new Date(2000, 1, 1, project.master.household['heating_weekend_on1_hours'], project.master.household['heating_weekend_on1_mins'], 0, 0);
        hours_off.push(get_hours_off_one_period(time_on, time_off));
    } else {
        hours_off.push(0);
    }
    return hours_off;
}
function get_hours_off_one_period(time_on, time_off) {
    // heating is on before midnight and off after midnight
    if (time_on > time_off) {
        return(Math.abs(time_off - time_on) / 36e5);
    } else {
        time_on.setDate(time_on.getDate() + 1);
        return(Math.abs(time_on - time_off) / 36e5);
    }
}
function get_hours_two_periods(time_on_1, time_off_1, time_on_2, time_off_2) {
    var hours_off = [];
    hours_off.push((time_on_2 - time_off_1) / 36e5);
    hours_off.push(get_hours_off_one_period(time_on_1, time_off_2));
    return hours_off;
}
function get_hours_three_periods(time_on_1, time_off_1, time_on_2, time_off_2, time_on_3, time_off_3) {
    var hours_off = [];
    hours_off.push((time_on_2 - time_off_1) / 36e5);
    hours_off.push((time_on_3 - time_off_2) / 36e5);
    hours_off.push(get_hours_off_one_period(time_on_1, time_off_3));
    return hours_off;
}


/************************
 **  Measures
 ************************/

function format_performance_string(performance) {
    return performance.replace('WK.m2', 'W/m².K')
        .replace('W/K.m2', 'W/m².K')
        .replace('m3m2.hr50pa', 'm³/m².hr50pa')
        .replace('m3/m2.hr50pa', 'm³/m².hr50pa')
        .replace('W/msup2/sup.K', ' W/m².K')
        .replace('msup3/sup/msup2/sup.hr50pa', 'm³/m².hr50pa')
        .replace('na', 'n/a');
}

function getScenarioMeasures(scenarioData) {
    const result = [];

    function pushedNestedMeasures(measures_by_id) {
        for (const id in measures_by_id) {
            result.push(measures_by_id[id].measure);
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
                result.push(scenarioData.measures.ventilation.draught_proofing_measures.measure);
            }
            if ('ventilation_systems_measures' in scenarioData.measures.ventilation) {
                result.push(scenarioData.measures.ventilation.ventilation_systems_measures.measure);
            }
            if ('clothes_drying_facilities' in scenarioData.measures.ventilation) {
                pushedNestedMeasures(scenarioData.measures.ventilation.clothes_drying_facilities);
            }
        }

        // Water heating
        if ('water_heating' in scenarioData.measures) {
            if ('water_usage' in scenarioData.measures.water_heating) {
                pushedNestedMeasures(scenarioData.measures.water_heating.water_usage);
            }
            if ('storage_type_measures' in scenarioData.measures.water_heating) {
                result.push(scenarioData.measures.water_heating.storage_type_measures.measure);
            }
            if ('pipework_insulation' in scenarioData.measures.water_heating) {
                result.push(scenarioData.measures.water_heating.pipework_insulation.measure);
            }
            if ('hot_water_control_type' in scenarioData.measures.water_heating) {
                result.push(scenarioData.measures.water_heating.hot_water_control_type.measure);
            }
        }

        if ('space_heating_control_type' in scenarioData.measures) {
            pushedNestedMeasures(scenarioData.measures.space_heating_control_type);
        }

        if ('heating_systems' in scenarioData.measures) {
            pushedNestedMeasures(scenarioData.measures.heating_systems);
        }

        if ('LAC' in scenarioData.measures) {
            if ('lighting' in scenarioData.measures.LAC) {
                result.push(scenarioData.measures.LAC.lighting.measure);
            }
        }

        if (scenarioData.use_generation == 1 && 'PV_generation' in scenarioData.measures) {
            result.push(scenarioData.measures.PV_generation.measure);
        }
    }

    function normaliseLocation(location) {
        // Due to a historical mess, sometimes measure.location includes either
        // '<br>' or 'br'.  This should be normalised to whitespace.
        // This used to happen on bulk measures.
        location = location.replace(/,br/g, ', ').replace(/,<br>/g, ', ').trim();

        // The code used to also put excess commas at the ends of things.
        // TODO: Fix this bug in the data, not the code.
        if (location[location.length - 1] === ',') {
            location = location.substring(0, location.length - 1);
        }

        return location;
    }

    function normaliseCost(cost) {
        function roundToNearest(val, to) {
            return Math.ceil(val / to) * to;
        }

        if (cost < 500) {
            return roundToNearest(cost, 5);
        } else if (cost < 5000) {
            return roundToNearest(cost, 50);
        } else {
            return roundToNearest(cost, 500);
        }
    }

    return result.map((row, idx) => Object.assign({}, row, {
        num: idx + 1,
        tag: row.lib || row.tag,
        location: row.location ? normaliseLocation(row.location) : 'Whole house',
        description: row.description || '',
        key_risks: row.key_risks || '',
        associated_work: row.associated_work || '',
        quantity: (1.0 * row.quantity).toFixed(2),
        cost_total: normaliseCost(1.0 * row.cost_total).toFixed(2),
        maintenance: row.maintenance || 'N/A',
        disruption: row.disruption ? row.disruption.replace('MEDIUMHIGH', 'MEDIUM / HIGH') : 'N/A',
        performance: row.performance ? format_performance_string(row.performance) : '',
    }));
}

function measures_costs(scenarioId) {
    return getScenarioMeasures(project[scenarioId])
        .map(row => row.cost_total)
        .reduce((prev, curr) => prev + (1.0 * curr), 0);
}

// Add extra properties to measure
function add_quantity_and_cost_to_measure(measure) {
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


/************************
 **  Revert to original
 ************************/
function init_revert_to_original_by_id(selector, item_id, type_of_item) {
    selector = selector + ' .revert-to-original[item-id="' + item_id + '"]';
    if (scenario != 'master') {
        if (measure_applied_to_item_by_id(type_of_item, item_id) != false && data.created_from != undefined) {
            if (data.created_from == 'master') {
                $(selector + ' .text').html('Revert to master');
            } else {
                var html = 'Revert to Scenario ' + data.created_from.split('scenario')[1];
                $(selector + ' .text').html(html);
            }
            $(selector).show();
            // Check original element still exists, it may have been deleted
            if (item_exists_in_original(data.created_from, item_id, type_of_item) == false) {
                $(selector).removeClass('revert-to-original').css('cursor', 'default').html("Original element doesn't<br />exist, cannot revert");
                return;
            }
            $('#openbem').on('click', selector, function () {
                revert_to_original(item_id, type_of_item);
            });
        } else {
            $(selector).hide();
        }
    } else {
        $(selector).hide();
    }
}
function measure_applied_to_item_by_id(type_of_item, item_id) {
    var measures_by_id = {};
    switch (type_of_item) {
        case'fabric-elements':
            measures_by_id = data.fabric.measures;
            break;
        case'ventilation-EVP':
            measures_by_id = data.measures.ventilation.extract_ventilation_points;
            break;
        default:
            console.error('Type of item not valid');
    }
    for (var measure_id in measures_by_id) {
        if (measure_id == item_id) {
            return true;
        }
        /*else if (measure_applied_in_bulk(element_id) != false) {
         return true;
         }*/
    }
    return false;
}
function item_exists_in_original(original_scenario, item_id, type_of_item) {
    var items_array = [];
    switch (type_of_item) {
        case'fabric-elements':
            items_array = project[original_scenario].fabric.elements;
            break;
        case'ventilation-EVP':
            items_array = project[original_scenario].ventilation.EVP;
            break;
        default:
            console.error('Type of item not valid');
    }
    for (var e in items_array) {
        if (items_array[e].id == item_id) {
            return true;
        }
    }
    return false;
}
function revert_to_original(item_id, type_of_item) {
    if (item_exists_in_original(data.created_from, item_id, type_of_item) == true) {
        var original_items_array = [];
        var current_items_array = [];
        var measures_by_id = {};
        switch (type_of_item) {
            case'fabric-elements':
                original_items_array = project[data.created_from].fabric.elements;
                current_items_array = data.fabric.elements;
                measures_by_id = data.fabric.measures;
                break;
            case'ventilation-EVP':
                original_items_array = project[data.created_from].ventilation.EVP;
                current_items_array = data.ventilation.EVP;
                measures_by_id = data.measures.ventilation.extract_ventilation_points;
                break;
            default:
                console.error('Type of item not valid');
        }
        // copy the original element
        for (var e in original_items_array) {
            if (original_items_array[e].id == item_id) {
                current_items_array[get_item_index_by_id(item_id, current_items_array)] = JSON.parse(JSON.stringify(original_items_array[e]));
                break;
            }
        }
        // delete measure
        delete(measures_by_id[item_id]);
    }
    update();
}
function get_item_index_by_id(id, array) {
    for (var index in array) {
        if (array[index].id == id) {
            return index;
        }
    }
}

/**
 * Given a project data, return a new object with only the model inputs
 * in it.
 */
function extract_assessment_inputs(project) {
    var result = {};
    for (let z in project) {
        try {
            result[z] = _extract_scenario_inputs(project[z]);
        } catch (e) {
            console.error('Error saving input', e);
            if (window.Sentry) {
                Sentry.captureException(e);
            }
            result[z] = project[z];
        }
    }
    return result;
}

function _extract_scenario_inputs(data) {
    var inputdata = {};
    inputdata.scenario_name = data.scenario_name;
    inputdata.scenario_description = data.scenario_description;
    inputdata.sidebarExpanded = data.sidebarExpanded;
    inputdata.household = data.household;
    inputdata.region = data.region;
    inputdata.region_full = data.region_full;
    inputdata.altitude = data.altitude;
    inputdata.altitude_full = data.altitude_full;
    inputdata.use_custom_occupancy = data.use_custom_occupancy;
    inputdata.custom_occupancy = data.custom_occupancy;
    inputdata.floors = [];
    inputdata.locked = data.locked;
    inputdata.created_from = data.created_from;
    inputdata.creation_hash = data.creation_hash;
    for (z in data.floors) {
        inputdata.floors[z] = {name: data.floors[z].name, area: data.floors[z].area, height: data.floors[z].height};
    }

    inputdata.fabric = {
        thermal_bridging_yvalue: data.fabric.thermal_bridging_yvalue,
        global_TMP: data.fabric.global_TMP,
        global_TMP_value: data.fabric.global_TMP_value,
        elements: [],
        measures: data.fabric.measures
    };
    for (z in data.fabric.elements) {
        inputdata.fabric.elements[z] = {
            type: data.fabric.elements[z].type,
            name: data.fabric.elements[z].name,
            lib: data.fabric.elements[z].lib,
            subtractfrom: data.fabric.elements[z].subtractfrom,
            l: data.fabric.elements[z].l,
            h: data.fabric.elements[z].h,
            perimeter: data.fabric.elements[z].perimeter,
            area: data.fabric.elements[z].area,
            areaInputs: data.fabric.elements[z].areaInputs,
            uvalue: 1.0 * data.fabric.elements[z].uvalue,
            id: 1.0 * data.fabric.elements[z].id,
            location: data.fabric.elements[z].location || '',
            description: data.fabric.elements[z].description || '',
            kvalue: data.fabric.elements[z].kvalue || '',
            orientation: data.fabric.elements[z].orientation,
            overshading: data.fabric.elements[z].overshading,
            g: data.fabric.elements[z].g || '',
            gL: data.fabric.elements[z].gL || '',
            ff: data.fabric.elements[z].ff || '',
            performance: data.fabric.elements[z].performance || '',
            benefits: data.fabric.elements[z].benefits || '',
            cost: data.fabric.elements[z].cost || '',
            who_by: data.fabric.elements[z].who_by || '',
            disruption: data.fabric.elements[z].disruption || '',
            associated_work: data.fabric.elements[z].associated_work || '',
            notes: data.fabric.elements[z].notes || '',
            maintenance: data.fabric.elements[z].maintenance || '',
            EWI: data.fabric.elements[z].EWI,
            cost_total: data.fabric.elements[z].cost_total,
            quantity: data.fabric.elements[z].quantity,
            perFloorTypeSpec: data.fabric.elements[z].perFloorTypeSpec,
            selectedFloorType: data.fabric.elements[z].selectedFloorType,
        };
    }

    inputdata.num_of_floors_override = data.num_of_floors_override;
    inputdata.ventilation = {
        air_permeability_test: data.ventilation.air_permeability_test,
        air_permeability_value: data.ventilation.air_permeability_value,
        dwelling_construction: data.ventilation.dwelling_construction,
        suspended_wooden_floor: data.ventilation.suspended_wooden_floor,
        draught_lobby: data.ventilation.draught_lobby,
        percentage_draught_proofed: data.ventilation.percentage_draught_proofed,
        number_of_sides_sheltered: data.ventilation.number_of_sides_sheltered,
        ventilation_type: data.ventilation.ventilation_type,
        ventilation_tag: data.ventilation.ventilation_tag,
        ventilation_name: data.ventilation.ventilation_name,
        system_air_change_rate: data.ventilation.system_air_change_rate,
        balanced_heat_recovery_efficiency: data.ventilation.balanced_heat_recovery_efficiency,
        system_specific_fan_power: data.ventilation.system_specific_fan_power,
        IVF: data.ventilation.IVF,
        EVP: data.ventilation.EVP,
        CDF: data.ventilation.CDF
    };

    inputdata.LAC = data.LAC;
    inputdata.LAC_calculation_type = data.LAC_calculation_type;
    inputdata.use_generation = 1;
    inputdata.generation = data.generation;
    inputdata.currentenergy = {
        use_by_fuel: data.currentenergy.use_by_fuel,
        onsite_generation: data.currentenergy.onsite_generation,
        generation: data.currentenergy.generation
    };

    inputdata.water_heating = {
        low_water_use_design: data.water_heating.low_water_use_design,
        solar_water_heating: data.water_heating.solar_water_heating,
        pipework_insulated_fraction: data.water_heating.pipework_insulated_fraction,
        pipework_insulation: data.water_heating.pipework_insulation,
        storage_type: data.water_heating.storage_type,
        community_heating: data.water_heating.community_heating,
        hot_water_store_in_dwelling: data.water_heating.hot_water_store_in_dwelling,
        contains_dedicated_solar_storage_or_WWHRS: data.water_heating.contains_dedicated_solar_storage_or_WWHRS,
        hot_water_control_type: data.water_heating.hot_water_control_type,
        override_annual_energy_content: data.water_heating.override_annual_energy_content,
        annual_energy_content: data.water_heating.annual_energy_content,
        Vc: data.water_heating.Vc,
        water_usage: data.water_heating.water_usage
    };
    inputdata.fans_and_pumps = data.fans_and_pumps;
    inputdata.use_SHW = data.use_SHW;
    if (data.SHW.version === 1) {
        inputdata.SHW = {
            version: data.SHW.version,
            pump: data.SHW.pump,
            input: data.SHW.input
        };
    } else {
        inputdata.SHW = {
            A: data.SHW.A,
            n0: data.SHW.n0,
            a1: data.SHW.a1,
            a2: data.SHW.a2,
            inclination: data.SHW.inclination,
            orientation: data.SHW.orientation,
            overshading: data.SHW.overshading,
            Vs: data.SHW.Vs,
            combined_cylinder_volume: data.SHW.combined_cylinder_volume,
            pump: data.SHW.pump
        };
    }

    inputdata.appliancelist = {list: []};
    if ('appliancelist' in data && 'list' in data.appliancelist) {
        for (z in data.appliancelist.list) {
            inputdata.appliancelist.list[z] = {
                name: data.appliancelist.list[z].name,
                category: data.appliancelist.list[z].category,
                power: data.appliancelist.list[z].power,
                fuel: data.appliancelist.list[z].fuel,
                efficiency: data.appliancelist.list[z].efficiency,
                hours: data.appliancelist.list[z].hours
            };
        }
    }

    inputdata.applianceCarbonCoop = {list: []};
    if ('applianceCarbonCoop' in data && 'list' in data.applianceCarbonCoop) {
        for (z in data.applianceCarbonCoop.list) {
            inputdata.applianceCarbonCoop.list[z] = {
                category: data.applianceCarbonCoop.list[z].category,
                name: data.applianceCarbonCoop.list[z].name,
                number_used: data.applianceCarbonCoop.list[z].number_used,
                a_plus_rated: data.applianceCarbonCoop.list[z].a_plus_rated,
                norm_demand: data.applianceCarbonCoop.list[z].norm_demand,
                units: data.applianceCarbonCoop.list[z].units,
                utilisation_factor: data.applianceCarbonCoop.list[z].utilisation_factor,
                frequency: data.applianceCarbonCoop.list[z].frequency,
                reference_quantity: data.applianceCarbonCoop.list[z].reference_quantity,
                type_of_fuel: data.applianceCarbonCoop.list[z].type_of_fuel,
                efficiency: data.applianceCarbonCoop.list[z].efficiency,
                fuel: data.applianceCarbonCoop.list[z].fuel
            };
        }
    }

    inputdata.temperature = {
        responsiveness: data.temperature.responsiveness,
        target: data.temperature.target,
        living_area: data.temperature.living_area,
        temperature_adjustment: data.temperature.temperature_adjustment,
        hours_off: data.temperature.hours_off
    };
    inputdata.space_heating = {
        use_utilfactor_forgains: data.space_heating.use_utilfactor_forgains,
        heating_off_summer: data.space_heating.heating_off_summer
    };

    inputdata.heating_systems = data.heating_systems;

    inputdata.fuels = data.fuels;
    inputdata.imagegallery = data.imagegallery;
    inputdata.imagegallery_notes = data.imagegallery_notes;
    inputdata.featuredimage = data.featuredimage;
    inputdata.measures = data.measures;
    inputdata.modelBehaviourVersion = data.modelBehaviourVersion

    return inputdata;
}

function getScenarioIds({ project, excludeBase = false } = {}) {
    let result = Object.keys(project);
    if (excludeBase) {
        return result.filter(key => key !== 'master');
    } else {
        return result;
    }
}


/** Some debugging helpers **/

function lines(obj, prefix = '.') {
    return Object.entries(obj).flatMap(([ k, v ]) => {
        if (typeof v === 'object' && v !== null ) {
            return lines(v, prefix + k + '.');
        } else {
            return { key: `${prefix}${k}`, value: v };
        }
    });
}

function diff(left, right) {
    const lleft = lines(left);
    const lright = lines(right);
    const mleft = new Map(lleft.map(e => [ e.key, e.value ]));
    const mright = new Map(lright.map(e => [ e.key, e.value ]));
    const allKeys = new Set(lleft.concat(lright).map(e => e.key));

    for (let e of allKeys) {
        const lval = mleft.get(e);
        const rval = mright.get(e);
        const bothNaN = typeof lval == 'number' && typeof rval == 'number' && isNaN(lval) && isNaN(rval);

        if (lval !== rval && !bothNaN) {
            if (lval !== undefined) {
                console.log(`- ${e} = ${lval}`);
            }
            if (rval !== undefined) {
                console.log(`+ ${e} = ${rval}`);
            }
        }
    }
}
