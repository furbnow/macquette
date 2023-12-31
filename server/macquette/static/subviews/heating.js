console.log('debug heating.js');

function heating_UpdateUI() {
    add_water_usage();
    add_heating_systems();
    add_storage();
    if (data.water_heating.override_annual_energy_content) {
        $('#annual_energy_content').html('<input type="text"  dp=0 style="width:35px; margin-right:10px" key="data.water_heating.annual_energy_content" /> kWh/year');
    } else {
        $('#annual_energy_content').html('<span key="data.water_heating.annual_energy_content" dp=0></span>  kWh/year');
    }
    //Add "Hot water storage control type" and "Pipework insulation" if any of the systems requires it
    data.heating_systems.forEach(function (system) {
        var show = false;
        if (system.primary_circuit_loss == 'Yes') {
            show = true;
        }
        if (show == true) {
            $('.if-primary-circuit-loss').show();
        }
    });
    show_hide_if_master();

    // Measures applied
    if (data.measures.water_heating != undefined) {
        if (data.measures.water_heating.water_usage != undefined) {
            for (var id in data.measures.water_heating.water_usage) {
                $('.WU-measure-applied[item-id=' + id + ']').show();
            }
        }
        if (data.measures.water_heating.pipework_insulation != undefined) {
            $('#pipework_insulation-measure-applied').show();
        }
        if (data.measures.water_heating.storage_type_measures != undefined) {
            $('#storage-type-measure-applied').show();
        }
        if (data.measures.water_heating.hot_water_control_type != undefined) {
            $('#hot_water_control_type-measure-applied').show();
        }
    }
    if (data.measures.space_heating_control_type != undefined) {
        for (var id in data.measures.space_heating_control_type) {
            $('.space_heating_control_type-measure-applied[item-id=' + id + ']').show();
        }

    }
    if (data.measures.heating_systems != undefined) {
        for (var id in data.measures.heating_systems) {
            $('.heating_systems-measure-applied[item-id=' + id + ']').show();
        }

    }
}

function heating_initUI() {
// Measures
    if (data.measures == undefined) {
        data.measures = {};
    }
    if (data.measures.water_heating == undefined) {
        data.measures.water_heating = {};
    }
    // Water heating
    $('#solarhotwater-link').prop('href', 'view?id=' + p.id + '#' + scenario + '/solarhotwater');
    // Space heating
    for (var day_type in data.temperature.hours_off) {
        var total_hours = 0;
        for (i in data.temperature.hours_off[day_type]) {
            total_hours += data.temperature.hours_off[day_type][i];
        }
        $('#hours-off-' + day_type).html(total_hours);
    }
    heating_UpdateUI();
}


$('#openbem').on('click', '[key="data.water_heating.solar_water_heating"]', function () {
    data.use_SHW = !data.water_heating.solar_water_heating; // Copy the negative because data.water_heating.solar_water_heating is not yet updated to the value of the checkbox
});
$('#openbem').on('click', '.add-water-efficiency-from-lib', function () {
    library_helper.type = 'water_usage';
    library_helper.onAddItemFromLib();
});
$('#openbem').on('click', '.add-heating-system-from-lib', function () {
    library_helper.type = 'heating_systems';
    library_helper.onAddItemFromLib();
});
$('#openbem').on('click', '.add-water_usage', function () {
    const tag = $(this).attr('tag');
    const library = library_helper.get_library_by_id($(this).attr('library')).data;
    const item = {
        ...library[tag],
        tag,
        id: get_WU_max_id(data.water_heating.water_usage) + 1,
    };
    data.water_heating.water_usage.push(item);
    update();
});
$('#openbem').on('click', '.delete-water-usage', function () {
    var row = $(this).attr('row');
    data.water_heating.water_usage.splice(row, 1);
    update();
});
$('#openbem').on('click', '.edit-item-water-usage', function () {
    library_helper.type = 'water_usage';
    library_helper.onEditItem($(this));
});
$('#openbem').on('click', '.apply-water-heating-measure', function () {
//1. Set variables in library_helper
    library_helper.type_of_measure = $(this).attr('type');
    if (library_helper.type_of_measure == 'add_heating_systems_measure') {
        library_helper.type = 'heating_systems_measures';
    } else {
        library_helper.type = library_helper.type_of_measure;
    }
    // 2. Prepare modal
    $('#apply-measure-water-heating-finish').hide();
    $('#apply-measure-water-heating-modal .modal-body > div').hide();
    // Populate selects in modal to choose library and measure
    var out = library_helper.get_list_of_libraries_for_select(library_helper.type);
    $('#apply-measure-water-heating-library-select').html(out);
    var library_id = $('#apply-measure-water-heating-library-select').val();
    if (library_helper.type == 'heating_systems_measures' || library_helper.type == 'storage_type_measures') {
        out = library_helper.get_list_of_items_for_select_by_category(library_id);
    } else {
        out = library_helper.get_list_of_items_for_select(library_id);
    }
    $('#apply-measure-water-heating-items-select').html(out);
    // Populate body of modal
    var tag = $('#apply-measure-water-heating-items-select').val();
    var function_name = library_helper.type + '_item_to_html';
    var item = library_helper.get_library_by_id(library_id).data[tag];
    out = library_helper[function_name](item, tag);
    $('#apply-measure-water-heating-modal .modal-body').html(out);
    // 3. Specific action for each type of measure
    switch (library_helper.type_of_measure) {
        case 'water_usage':
            $('#apply-measure-water-heating-what-to-do').hide();
            $('#apply-measure-water-heating-library-item-selects').show();
            $('#apply-measure-water-heating-modal .modal-body').show();
            $('#apply-measure-water-heating-modal #myModalIntroText').html('Choose a measure from a library');
            break;
        case 'storage_type':
            $('#apply-measure-water-heating-what-to-do').hide();
            $('#apply-measure-water-heating-library-item-selects').show();
            $('#apply-measure-water-heating-modal .modal-body').show();
            $('#apply-measure-water-heating-modal #myModalIntroText').html('Choose a measure from a library');
            break;
        case 'pipework_insulation':
            $('#apply-measure-water-heating-pipework-insulation select').val(data.water_heating.pipework_insulation);
            $('#apply-measure-water-heating-what-to-do').hide();
            $('#apply-measure-water-heating-library-item-selects').show();
            $('#apply-measure-water-heating-modal .modal-body').show();
            $('#apply-measure-water-heating-modal #myModalIntroText').html('Choose a measure from a library');
            break;
        case'space_heating_control_type':
        case 'heating_systems_measures':
            var item_index = $(this).attr('item-index');
            $('#apply-measure-water-heating-ok').attr('item-index', item_index);
        default:
            $('#apply-measure-water-heating-what-to-do').hide();
            $('#apply-measure-water-heating-library-item-selects').show();
            $('#apply-measure-water-heating-modal .modal-body').show();
            $('#apply-measure-water-heating-modal #myModalIntroText').html('Choose a measure from a library');
    }
    $('#apply-measure-water-heating-modal').modal('show');
});
$('#openbem').on('change', '#apply-measure-water-heating-library-select', function () {
    var library_id = $('#apply-measure-water-heating-library-select').val();
    out = library_helper.get_list_of_items_for_select(library_id);
    $('#apply-measure-water-heating-items-select').html(out);
    var tag = $('#apply-measure-water-heating-items-select').val();
    var function_name = library_helper.type + '_item_to_html';
    var item = library_helper.get_library_by_id(library_id).data[tag];
    out = library_helper[function_name](item, tag);
    $('#apply-measure-water-heating-modal .modal-body').html(out);
});
$('#openbem').on('change', '#apply-measure-water-heating-items-select', function () {
    var library_id = $('#apply-measure-water-heating-library-select').val();
    var tag = $('#apply-measure-water-heating-items-select').val();
    var function_name = library_helper.type + '_item_to_html';
    var item = library_helper.get_library_by_id(library_id).data[tag];
    out = library_helper[function_name](item, tag);
    $('#apply-measure-water-heating-modal .modal-body').html(out);
});
$('#openbem').on('click', '#apply-measure-water-heating-ok', function () {
// The first time we apply a measure to an element we record its original stage
    if (library_helper.type === 'space_heating_control_type') {
        if (data.measures.space_heating_control_type == undefined) {
            data.measures.space_heating_control_type = {};
        }
    } else if (library_helper.type === 'heating_systems_measures') {
        if (data.measures.heating_systems == undefined) {
            data.measures.heating_systems = {};
        }
    } else if (data.measures.water_heating[library_helper.type] == undefined) { // If it is the first time we apply a measure to this element iin this scenario
        data.measures.water_heating[library_helper.type] = {};
    }
    switch (library_helper.type_of_measure) {
        case 'water_usage':
            var measure = library_helper.water_usage_get_item_to_save();
            for (z in measure) {
                var tag = z;
            }
            measure[tag].tag = tag;
            measure[tag].id = get_WU_max_id(data.water_heating.water_usage) + 1;
            add_quantity_and_cost_to_measure(measure[tag]);
            // Update data object and add measure
            data.measures.water_heating[library_helper.type][measure[tag].id] = {};
            data.measures.water_heating[library_helper.type][measure[tag].id].original = 'empty';
            data.measures.water_heating[library_helper.type][measure[tag].id].measure = measure[tag];
            data.water_heating.water_usage.push(measure[tag]);
            break;
        case 'storage_type_measures':
            // first time
            if (data.measures.water_heating[library_helper.type].original == undefined) {
                data.measures.water_heating[library_helper.type].original = data.water_heating.storage_type;
            }
            var measure = library_helper.storage_type_measures_get_item_to_save();
            for (z in measure) {
                var tag = z;
            }
            measure[tag].tag = tag;
            add_quantity_and_cost_to_measure(measure[tag]);
            // Update data object and add measure
            data.measures.water_heating[library_helper.type].measure = measure[tag];
            data.water_heating.storage_type = measure[tag];
            break;
        case 'pipework_insulation':
            if (data.measures.water_heating['pipework_insulation'] == undefined) {
                data.measures.water_heating['pipework_insulation'] = {};
            }
            // first time
            if (data.measures.water_heating['pipework_insulation'].original == undefined) {
                data.measures.water_heating['pipework_insulation'].original = data.water_heating.pipework_insulation;
            }
            var measure = library_helper.pipework_insulation_get_item_to_save();
            for (z in measure) {
                var tag = z;
            }
            measure[tag].tag = tag;
            add_quantity_and_cost_to_measure(measure[tag]);
            // Update data object and add measure
            data.measures.water_heating['pipework_insulation'].measure = measure[tag];
            data.water_heating.pipework_insulation = measure[tag].pipework_insulation;
            break;
        case 'hot_water_control_type':
            if (data.measures.water_heating['hot_water_control_type'] == undefined) {
                data.measures.water_heating['hot_water_control_type'] = {};
            }
            // first time
            if (data.measures.water_heating['hot_water_control_type'].original == undefined) {
                data.measures.water_heating['hot_water_control_type'].original = data.water_heating.hot_water_control_type;
            }
            var measure = library_helper.hot_water_control_type_get_item_to_save();
            for (z in measure) {
                var tag = z;
            }
            measure[tag].tag = tag;
            add_quantity_and_cost_to_measure(measure[tag]);
            // Update data object and add measure
            data.measures.water_heating['hot_water_control_type'].measure = measure[tag];
            data.water_heating.hot_water_control_type = measure[tag].control_type;
            break;
        case 'space_heating_control_type':
            var item_index = $(this).attr('item-index');
            var item = data.heating_systems[item_index];
            //if first time we apply a measure to this system
            if (data.measures.space_heating_control_type[item.id] == undefined) {
                data.measures.space_heating_control_type[item.id] = {original: item.heating_controls, measure: {}};
            }
            var measure = library_helper.space_heating_control_type_get_item_to_save();
            for (z in measure) {
                var tag = z;
            }
            measure[tag].tag = tag;
            add_quantity_and_cost_to_measure(measure[tag]);
            // Update data object and add measure
            data.measures.space_heating_control_type[item.id].measure = measure[tag];
            data.heating_systems[item_index].heating_controls = measure[tag].control_type;
            break;
        case 'heating_systems_measures':
            var item_index = $(this).attr('item-index');
            var item = data.heating_systems[item_index];
            //if first time we apply a measure to this system
            if (data.measures.heating_systems[item.id] == undefined) {
                data.measures.heating_systems[item.id] = {original: item, measure: {}};
            }
            var measure = library_helper.heating_systems_measures_get_item_to_save();
            for (z in measure) {
                var tag = z;
            }
            measure[tag].tag = tag;
            if (measure[tag].category == 'Warm air systems') {
                measure[tag].fans_and_supply_pumps = 0.4 * measure[tag].sfp * data.volume;
            }
            add_quantity_and_cost_to_measure(measure[tag]);
            // Add properties that were in the original item
            for (z in item) {
                if (measure[tag][z] == undefined) {
                    measure[tag][z] = item[z];
                }
            }
            // Update data object and add measure
            data.measures.heating_systems[item.id].measure = measure[tag];
            data.heating_systems[item_index] = measure[tag];
            break;
        case 'add_heating_systems_measure':
            var item_id = get_HS_max_id() + 1;
            //if first time we apply a measure to this system
            if (data.measures.heating_systems[item_id] == undefined) {
                data.measures.heating_systems[item_id] = {original: 'empty', measure: {}};
            }
            var measure = library_helper.heating_systems_measures_get_item_to_save();
            for (z in measure) {
                var tag = z;
            }
            measure[tag].tag = tag;
            measure[tag].id = item_id;
            if (measure[tag].category == 'Warm air systems') {
                measure[tag].fans_and_supply_pumps = 0.4 * measure[tag].sfp * data.volume;
            }
            add_quantity_and_cost_to_measure(measure[tag]);
            // Add extra properties to measure
            measure[tag].fuel = 'Standard Tariff';
            measure[tag].fraction_space = 1;
            measure[tag].fraction_water_heating = 1;
            measure[tag].main_space_heating_system = 'secondaryHS';
            measure[tag].temperature_adjustment = 0;
            measure[tag].provides = 'heating_and_water';
            measure[tag].instantaneous_water_heating = false;
            measure[tag].heating_controls = 1;
            // Update data object and add measure
            data.measures.heating_systems[item_id].measure = measure[tag];
            data.heating_systems.push(measure[tag]);
            break;
    }
    heating_initUI();
    update();
    $('#apply-measure-water-heating-modal').modal('hide');
});
$('#openbem').on('click', '.select-type-of-storage-from-lib', function () {
    library_helper.type = 'storage_type';
    library_helper.onAddItemFromLib();
});
$('#openbem').on('click', '.add-storage-type ', function () {
    var tag = $(this).attr('tag');
    var library = library_helper.get_library_by_id($(this).attr('library')).data;
    const item = {
        ...library[tag],
        tag
    };
    data.water_heating.storage_type = item;
    update();
    heating_initUI();
});
$('#openbem').on('click', '.delete-storage', function () {
    if (!window.confirm('Deleting an element is not considered a measure.  Really delete?')) {
        return;
    }

    delete data.water_heating.storage_type;
    console.log('hola');
    update();
});
$('#openbem').on('click', '.add-heating-system', function () {
    const tag = $(this).attr('tag');
    const library = library_helper.get_library_by_id($(this).attr('library')).data;
    const item = {
        ...library[tag],
        tag,
        id: get_HS_max_id() + 1,
        fuel: 'Standard Tariff',
        fraction_space: 1,
        fraction_water_heating: 1,
        main_space_heating_system: 'secondaryHS',
        temperature_adjustment: 0,
        provides: 'heating_and_water',
        instantaneous_water_heating: false,
        heating_controls: 1,
    };

    data.heating_systems.push(item);
    update();
});
$('#openbem').on('click', '.delete-heating-system', function () {
    var row = $(this).attr('row');
    data.heating_systems.splice(row, 1);
    update();
});
$('#openbem').on('click', '.edit-item-heating-system', function () {
    library_helper.type = 'heating_systems';
    library_helper.onEditItem($(this));
});
function get_WU_max_id() {
    var max_id = 0;
    // Find the max id
    for (z in data.water_heating.water_usage) {
        if (data.water_heating.water_usage[z].id != undefined && data.water_heating.water_usage[z].id > max_id) {
            max_id = data.water_heating.water_usage[z].id;
        }
    }
    for (z in data.measures.water_heating.water_usage) {
        if (z > max_id) {
            max_id = z;
        }
    }
    return 1.0 * max_id;
}
function get_HS_max_id() {
    var max_id = 0;
    // Find the max id
    for (z in data.heating_systems) {
        if (data.heating_systems[z].id != undefined && data.heating_systems[z].id > max_id) {
            max_id = data.heating_systems[z].id;
        }
    }
    for (z in data.measures.heating_systems) {
        if (z > max_id) {
            max_id = z;
        }
    }
    return 1.0 * max_id;
}
function add_water_usage() {
    if (data.water_heating.water_usage.length > 0) {
        $('#water-usage').show();
    } else {
        $('#water-usage').hide();
    }
    $('#water-usage').html('');
    for (z in data.water_heating.water_usage) {
        var item = data.water_heating.water_usage[z];
        var out = '<tr><td style="padding-left:75px;width:250px;border:none">' + item.tag + ': ' + item.name + '</td>';
        //out += '<button class="apply-water-heating-measure if-not-master" type="water_usage" item_id="' + item.id + '" style="margin-right:25px">Apply Measure</button>'
        out += '<td style="border:none"><span class="edit-item-water-usage" row="' + z + '" tag="' + item.tag + '" style="cursor:pointer; margin-right:15px" item=\'' + JSON.stringify(item) + '\' title="Editing this way is not considered a Measure"> <a><i class = "icon-edit"> </i></a></span>';
        out += '<span class = "delete-water-usage" row="' + z + '" style="cursor:pointer" title="Deleting an element this way is not considered a Measure" ><a> <i class="icon-trash" ></i></a></span></td>';
        out += '<td style="border:none"><p class="WU-measure-applied" item-id="' + item.id + '" style="display: none">Measure applied</p></td></tr> ';
        $('#water-usage').append(out);
    }
}
function get_heating_system_options(mainHSs) {
    var out = '';
    if (mainHSs.mainHS1 === false) {
        out += '<option value="mainHS1">Main heating system</option>';
        out += '<option value="mainHS2_whole_house" disabled>2<sup>nd</sup> Main heating system - whole house</option>';
        out += '<option value="mainHS2_part_of_the_house" disabled>2<sup>nd</sup> Main heating system - different part of the house</option>';
    } else if (mainHSs.mainHS2 === false) {
        out += '<option value="mainHS1" disabled>Main heating system</option>';
        out += '<option value="mainHS2_whole_house">2<sup>nd</sup> Main heating system - whole house</option>';
        out += '<option value="mainHS2_part_of_the_house">2<sup>nd</sup> Main heating system - different part of the house</option>';
    } else {
        out += '<option value="mainHS1" disabled>Main heating system</option>';
        out += '<option value="mainHS2_whole_house" disabled>2<sup>nd</sup> Main heating system - whole house</option>';
        out += '<option value="mainHS2_part_of_the_house" disabled>2<sup>nd</sup> Main heating system - different part of the house</option>';
    }

    out += '<option value="secondaryHS">Secondary heating system</option>';
    return out;
}

function add_heating_systems() {
    if (data.heating_systems.length > 0) {
        $('#heating-systems').show();
    } else {
        $('#heating-systems').hide();
    }

    $('#heating-systems tbody').html('');

    // Generate html string
    var mainHSs = {mainHS1: false, mainHS2: false};// Used to enable/disable options in the "main_space_heating_system" select
    var isMaster = scenario === 'master';

    for (z in data.heating_systems) {
        const item = data.heating_systems[z];
        const providesWH = item.provides === 'water' || item.provides === 'heating_and_water';
        const providesSH = item.provides === 'heating' || item.provides === 'heating_and_water';

        out = `
            <tr style="background-color: var(--grey-800)">
                <td colspan="10">
                    <b>${item.tag}: ${item.name}</b>

                    <span class="heating_systems-measure-applied" item-id="${item.id}" style="display: none">
                        (measure applied)
                    </span>

                    <button class="btn edit-item-heating-system if-master ml-7" row="${z}" tag="${item.tag}" item='${JSON.stringify(item)}'>
                        <i class="icon-edit"></i> Edit
                    </button>

                    <button class="btn delete-heating-system if-master ml-7" row="${z}">
                        <i class="icon-trash"></i> Delete
                    </button>

                    <button class="btn apply-water-heating-measure if-not-master if-not-locked ml-7" type="heating_systems_measures" item-index="${z}">
                        Apply measure
                    </button>
                </td>
            </tr>
            <tr class="tr-no-top-border">
                <td>
                    <span class="small-caps">Provides</span><br>
                    <select style="width: 200px" key="data.heating_systems.${z}.provides">
                        <option value="heating">Space heating</option>
                        <option value="water">Water heating</option>
                        <option value="heating_and_water">Space and water heating</option>
                    </select>

                    <br>

                    <span class="small-caps">Fuel</span><br>
                    <select style="width: 230px" key="data.heating_systems.${z}.fuel">
                        ${get_fuels_for_select()}
                    </select>
                </td>
                <td class="stack-v">
                    ${providesSH ? `
                    <section>
                        <h4 class="mt-0">Space Heating</h4>

                        <div class="form-grid__root">
                            <label>Space heating / Winter efficiency</label>
                            <div class="form-control">
                                ${item.winter_efficiency}
                            </div>

                            <label>
                                Main heating system?
                                <i class='icon-question-sign' title='The main heating system is that which heats the largest proportion of the dwelling, and often provided hot water as well as space heating. If there is more than one main heating system identified, main system 1 always heats the living space. Secondary heating systems are room heaters - such as open fires or wood-stoves. If portable room heaters are used, they should be included in the calculations (note this is a deviation from standard SAP - ref p.40 SAP 9.92)'></i>
                            </label>
                            <div>
                                <select style="width: 200px" key="data.heating_systems.${z}.main_space_heating_system">
                                    ${get_heating_system_options(mainHSs)}
                                </select>
                            </div>

                            <label>
                                Fraction of space heating provided
                                <i class='icon-question-sign' title='This defines what proportion of the space heating or water heating for a home is provided by the system listed. For example, a standard assumption might be that a gas boiler provides 90% (0.9) of the space heating, and an open fire or room stove provides 10% (0.1). However, this can be adjusted using assessors informed judgement as required - and as many systems as are present can be included. If there are two main heating systems identified, the proportion of heat provided by each system should be taken as the relative heated floor area served by each system'></i>
                            </label>
                            <div>
                                <input style="width: 55px" type="number" key="data.heating_systems.${z}.fraction_space" max="1" step="0.01" min="0">
                            </div>

                            <label>Responsiveness <i class='icon-question-sign' title='Refer to Table 4d, p.209 SAP 9.92'></i></label>
                            <div>
                                <input style="width: 55px" type="number" key="data.heating_systems.${z}.responsiveness" max="1" step="0.01" min="0">
                            </div>

                            <label>Temperature adjustment <i class='icon-question-sign' title='SAP2012, table 4e, p.210'></i></label>
                            <div>
                                <input style="width: 55px" type="number" key="data.heating_systems.${z}.temperature_adjustment" max="1" step="0.01" min="0">
                            </div>

                            <label>Space heating controls <i class='icon-question-sign' title='Refer to Table 4e, p.210 SAP 9.92'></i></label>
                            <div>
                                <input type="number" key="data.heating_systems.${z}.heating_controls" ${isMaster ? '' : 'readonly'} style="width: 55px">
                                <button class="btn if-not-locked apply-water-heating-measure if-not-master" type="space_heating_control_type" item-index="${z}">
                                    Apply measure
                                </button>

                                <div class="space_heating_control_type-measure-applied" item-id="${item.id}" style="margin-top: 7px; display: none">
                                    Measure applied
                                </div>
                            </div>

                            <label>Central heating pump inside dwelling?</label>
                            <div>
                                <input type="checkbox" key="data.heating_systems.${z}.central_heating_pump_inside">
                            </div>
                        </div>
                    </section>
                    ` : ''}

                    ${providesWH ? `
                    <section>
                        <h4 class="mt-0">Water Heating</h4>

                        <div class="form-grid__root">
                            <label>Water heating / Summer efficiency</label>
                            <span>${item.summer_efficiency}</span>

                            <label>
                                Fraction of water heating provided
                                <i class='icon-question-sign' title='This defines what proportion of the space heating or water heating for a home is provided by the system listed. For example, a standard assumption might be that a gas boiler provides 90% (0.9) of the space heating, and an open fire or room stove provides 10% (0.1). However, this can be adjusted using assessors informed judgement as required - and as many systems as are present can be included. If there are two main heating systems identified, the proportion of heat provided by each system should be taken as the relative heated floor area served by each system'></i>
                            </label>
                            <div>
                                <input class="form-control" style="width: 55px" type="number" key="data.heating_systems.${z}.fraction_water_heating">
                            </div>

                            <label>Instantaneous water heating at point of use?</label>
                            <div>
                                <input type="checkbox" key="data.heating_systems.${z}.instantaneous_water_heating">
                            </div>
                        </div>
                    </section>
                    `: ''}
                </td>
            </tr>`;

        if (item.main_space_heating_system == 'mainHS1') {
            mainHSs.mainHS1 = true;
        } else if (item.main_space_heating_system == 'mainHS2_whole_house' || item.main_space_heating_system == 'mainHS2_part_of_the_house') {
            mainHSs.mainHS2 = true;
        }

        $('#heating-systems tbody').append(out);
    }

}
function add_storage() {
    var st = data.water_heating.storage_type;
    if (st == undefined) {
        $('#type_of_storage').html(`
            <button class="btn select-type-of-storage-from-lib if-master"><i class="icon-plus if-not-locked"></i> Add water storage</button>
            <button class="btn apply-water-heating-measure if-not-master" type="storage_type_measures"><i class="icon-plus if-not-locked"></i> Add water storage measure</button>
        `);
    } else {
        var specific_header = '';
        var specific_st_info = '';
        if (st.declared_loss_factor_known == true) {
            specific_header = '<th>Manufacturers loss factor</th><th>Temperature factor a</th>';
            specific_st_info = '<td>' + st.manufacturer_loss_factor + '</td><td>' + st.temperature_factor_a + '</td>';
        } else {
            specific_header = '<th>Loss factor b</th><th>Volume factor b</th><th>Temperature factor b</th>';
            specific_st_info = '<td>' + st.loss_factor_b + '</td><td>' + st.volume_factor_b + '</td><td>' + st.temperature_factor_b + '</td>';
        }
        $('#type_of_storage').html(`
            <table class="table" id="type_of_storage">
                <tr>
                    <th>Type of storage</th>
                    <th>Volume</th>
                    ${specific_header}
                    <th>Inside dwelling?</th>
                    <th style="width:150px">Contains dedicated solar storage or <abbr title="WWHRS: Waste Water Heat Recovery">WWHRS</abbr> volume?</th>
                    <th></th>
                </tr>
                <tr>
                    <td>${st.tag}: ${st.name}</td>
                    <td>${st.storage_volume}</td>
                    ${specific_st_info}
                    <td>
                        <input type="checkbox" key="data.water_heating.hot_water_store_in_dwelling" />
                    </td>
                    <td>
                        <input style="width:54px" type="number" min="0" key="data.water_heating.contains_dedicated_solar_storage_or_WWHRS" /> litres
                    </td>
                    <td style="width:200px">
                        <button class="btn delete-storage">
                            <i class="icon-trash"></i>
                        </button>
                        <button class="btn select-type-of-storage-from-lib if-master">Replace from library</button>
                        <button class="btn apply-water-heating-measure if-not-master" type="storage_type_measures">Apply measure</button>

                        <p id="storage-type-measure-applied" style="display:none">
                            Measure applied
                        </p>
                    </td>
                </tr>
            </table>`);
    }

}
function edit_item(item, index, item_subsystem) {
    for (z in item) {
        item = item[z];
    } // item comes in the format: system = {electric:{bla bla bla}} and we transform it to: system = {bla bla bla}
    if (library_helper.type === 'water_usage') {
        var object = 'water_usage';
        for (z in data.water_heating[object][index]) { // We copy over all the properties that are not asked when editing an system, like id or tag
            if (item[z] == undefined) {
                item[z] = data.water_heating[object][index][z];
            }
        }
        data.water_heating[object][index] = item;
    } else if (library_helper.type === 'heating_systems') {
        for (z in data.heating_systems[index]) { // We copy over all the properties that are not asked when editing an system, like id or tag
            if (item[z] == undefined) {
                item[z] = data.heating_systems[index][z];
            }
        }
        data.heating_systems[index] = item;
    }

    update();
}
