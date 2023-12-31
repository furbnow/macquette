console.log('debug lac.js');

function LAC_initUI() {
    //data.appliancelist.list = [];
    //update();

    library_helper.type = 'appliances_and_cooking';

    //LAC SAP
    $('#LAC-lighting-fuels').html('');
    for (index in data.LAC.fuels_lighting) {
        if (index != 0) { // First fuel in array is added on LAC.html so no need to add it here
            var out = '<tr><td></td><td><select key="data.LAC.fuels_lighting.' + index + '.fuel" class="fuels" category="Electricity"></select></td><td><input type="number" style="width:55px" step="0.01" min="0" max="1" key="data.LAC.fuels_lighting.' + index + '.fraction" default="0"></td><td><span dp="2" key="data.LAC.fuels_lighting.' + index + '.fuel_input" /></td><td><i style="cursor:pointer" class="icon-trash delete-LAC-fuel" type="fuels_lighting" index="' + index + '"></i></td></tr>';
            $('#LAC-lighting-fuels').append(out);
        }
    }
    $('#LAC-appliances-fuels').html('');
    for (index in data.LAC.fuels_appliances) {
        if (index != 0) { // First fuel in array is added on LAC.html so no need to add it here
            var out = '<tr><td></td><td><select key="data.LAC.fuels_appliances.' + index + '.fuel" class="fuels" category="Electricity"></select></td><td><input type="number" style="width:55px" step="0.01" min="0" max="1" key="data.LAC.fuels_appliances.' + index + '.fraction" default="0"></td><td><span dp="2" key="data.LAC.fuels_appliances.' + index + '.fuel_input" /></td><td><i style="cursor:pointer" class="icon-trash delete-LAC-fuel" type="fuels_appliances" index="' + index + '"></i></td></tr>';
            $('#LAC-appliances-fuels').append(out);
        }
    }
    $('#LAC-cooking-fuels').html('');
    for (index in data.LAC.fuels_cooking) {
        if (index != 0) { // First fuel in array is added on LAC.html so no need to add it here
            var out = '<tr><td></td><td><select key="data.LAC.fuels_cooking.' + index + '.fuel" class="fuels" category="Electricity"></select></td><td><input type="number" style="width:55px" step="0.01" min="0" max="1" key="data.LAC.fuels_cooking.' + index + '.fraction" default="0"></td><td><span dp="2" key="data.LAC.fuels_cooking.' + index + '.fuel_input" /></td><td><i style="cursor:pointer" class="icon-trash delete-LAC-fuel" type="fuels_cooking" index="' + index + '"></i></td>/tr>';
            $('#LAC-cooking-fuels').append(out);
        }
    }

    if(scenario != 'master' && data.LAC.L == data.LAC.LLE) {
        $('#apply-measure-lighting').attr('disabled', 'true');
    }

    // Show "Measured applied" in lighting
    if (data.measures != undefined && data.measures.LAC != undefined && data.measures.LAC.lighting != undefined) {
        $('#lighting-measure-applied').show();
    }

    // Carbon Coop
    $('.carbonCoop-appliance').remove();
    $('.appliances-Carbon-Coop-category').hide();
    for (z in data.applianceCarbonCoop.list) {
        add_applianceCarbonCoop(z);
    }

    //Nothing to do to init the SAP div

    //For all of them
    $('select.fuels').each(function () {
        $(this).html(get_fuels_for_select($(this).attr('category')));
    });

    // Show divs according o the type of calculation
    show_LAC_divs(data.LAC_calculation_type);
}
function LAC_UpdateUI() {
    LAC_initUI();

    for (z in data.applianceCarbonCoop.list) {
        data.applianceCarbonCoop.list[z].energy_demand = 1.0 * data.applianceCarbonCoop.list[z].energy_demand.toFixed(2);
    }
    data.applianceCarbonCoop.energy_demand_total.total = 1.0 * data.applianceCarbonCoop.energy_demand_total.total.toFixed(2);
    data.applianceCarbonCoop.energy_demand_total.cooking = 1.0 * data.applianceCarbonCoop.energy_demand_total.cooking.toFixed(2);
    data.applianceCarbonCoop.energy_demand_total.appliances = 1.0 * data.applianceCarbonCoop.energy_demand_total.appliances.toFixed(2);
}

$('#openbem').on('change', '#LAC_calculation_type', function () {
    show_LAC_divs($('#LAC_calculation_type').val());
    library_helper.type = 'appliances_and_cooking';
});
$('#openbem').on('click', '.add-CarbonCoop-from-lib', function () {
    library_helper.type = 'appliances_and_cooking';
    library_helper.onAddItemFromLib();
});
$('#openbem').on('click', '.add-item-CarbonCoop', function () {
    var tag = $(this).attr('tag');
    var library = library_helper.get_library_by_id($(this).attr('library')).data;
    const item = {
        ...library[tag],
        tag: tag,
        number_used: 1,
        fuel: get_a_fuel(library[tag].type_of_fuel),
    };

    if (item.type_of_fuel == 'Electricity') {
        item.a_plus_rated = false;
    }

    // Push item
    data.applianceCarbonCoop.list.push(item);
    // Add appliance to the view and update
    add_applianceCarbonCoop(data.applianceCarbonCoop.list.length - 1);
    LAC_initUI();
    update();
});
$('#openbem').on('click', '.delete-appliance', function () {
    index = $(this).attr('index');
    data.applianceCarbonCoop.list.splice(index, 1);
    //appliannceCarbonCoop_initUI();
    LAC_initUI();
    update();
});
$('#openbem').on('click', '.add_LAC_fuel', function () { // Fix index
    var type = $(this).attr('type');
    var array_name = 'fuels_' + type;
    data.LAC[array_name].push({fuel: 'Standard Tariff', fraction: 0, fuel_input: 0});
    var index = data.LAC[array_name].length - 1;
    var out = '<tr><td></td><td><select key="data.LAC.fuels_' + type + '.' + index + '.fuel" class="fuels" category="Electricity"></select></td><td><input type="number" style="width:55px" step="0.01" max="1" key="data.LAC.fuels_' + type + '.' + index + '.fraction" default="0"></td><td><span key="data.LAC.fuels_' + type + '.' + index + 'fuel_input"/>    </td><td><i class="icon-trash delete-LAC-fuel" type="fuels_' + type + '" index="' + index + '"></i></td></tr>';
    $('#LAC-' + type + '-fuels').append(out);

    // Update
    LAC_initUI();
    update();
});
$('#openbem').on('click', '.delete-LAC-fuel', function () { // Fix index
    var array_name = $(this).attr('type');
    var index = $(this).attr('index');
    data.LAC[array_name].splice(index, 1);
    // Update
    LAC_initUI();
    update();
});
$('#openbem').on('click', '#apply-measure-lighting', function () {
    apply_LAC_measure('lighting');
});

function show_LAC_divs(type_of_calc) {
    $('#LAC-container .to-be-hidden').hide();
    switch (type_of_calc) {
        case 'SAP':
            $('#lighting-SAP').show();
            $('#appliances-SAP').show();
            $('#cooking-SAP').show();
            break;
        case 'carboncoop_SAPlighting':
            $('#lighting-SAP').show();
            $('#CarbonCoop').show();
            break;
    }
}
function add_applianceCarbonCoop(z) {
    var category = data.applianceCarbonCoop.list[z].category;
    var table_selector = '';
    switch (category) {
        case 'Food storage':
            table_selector = '#applianceCarbonCoop-' + 'Food-storage';
            break;
        case 'Other kitchen / cleaning':
            table_selector = '#applianceCarbonCoop-' + 'Other-kitchen-cleaning';
            break;
        default:
            table_selector = '#applianceCarbonCoop-' + category;
            break;
    }
    $(table_selector).show();
    var out = '<tr class="carbonCoop-appliance">';
    out += '<td style="text-align:left"><input style="text-align:left; width:100px" type="text" key="data.applianceCarbonCoop.list.' + z + '.name" style="width:50px" /></td>';
    out += '<td><input type="number" key="data.applianceCarbonCoop.list.' + z + '.number_used" style="width:30px" /></td>';
    if (data.applianceCarbonCoop.list[z].type_of_fuel == 'Electricity') {
        out += '<td><input type="checkbox" key="data.applianceCarbonCoop.list.' + z + '.a_plus_rated" /></td>';
    } else {
        out += '<td/>';
    }
    out += '<td><span key="data.applianceCarbonCoop.list.' + z + '.norm_demand"  style="width:40px" /> </td>';
    out += '<td><span key="data.applianceCarbonCoop.list.' + z + '.units" style="width:40px" /> </td>';
    out += '<td><span key="data.applianceCarbonCoop.list.' + z + '.utilisation_factor" style="width:40px" /> </td>';
    out += '<td><span key="data.applianceCarbonCoop.list.' + z + '.frequency" style="width:40px" /> </td>';
    out += '<td><span key="data.applianceCarbonCoop.list.' + z + '.reference_quantity" style="width:40px" /> </td>';
    out += '<td><span key="data.applianceCarbonCoop.list.' + z + '.type_of_fuel" style="width:40px" /> </td>';
    out += '<td><select key="data.applianceCarbonCoop.list.' + z + '.fuel" class="fuels" category="' + data.applianceCarbonCoop.list[z].type_of_fuel + '" style="width:150px" /> </td>';
    out += '<td><span key="data.applianceCarbonCoop.list.' + z + '.energy_demand" style="width:40px" /></td>';
    if (data.applianceCarbonCoop.list[z].type_of_fuel == 'Electricity') {
        out += '<td><span key="data.applianceCarbonCoop.list.' + z + '.efficiency" style="width:50px" /> </td>';
    } else {
        out += '<td><input type="number" max="1" step="0.01" key="data.applianceCarbonCoop.list.' + z + '.efficiency" style="width:50px" /> </td>';
    }
    out += '<td><span dp="2" key="data.applianceCarbonCoop.list.' + z + '.fuel_input" style="width:40px" /></td>';
    out += '<td><i index="' + z + '" class="delete-appliance icon-trash" style="cursor:pointer"></i></td>';
    out += '</tr>';
    $(table_selector).append(out);
}
function apply_LAC_measure(type) {
    if (data.measures.LAC == undefined) {
        data.measures.LAC = {};
    }

    switch (type) {
        case 'lighting':
            if (data.measures.LAC.lighting == undefined) {
                data.measures.LAC.lighting = {original_LLE: data.LAC.LLE, measure: {}};
            }

            var n_bulbs_to_change = data.LAC.L - data.LAC.LLE;
            data.measures.LAC.lighting.measure = extended_library.lighting_measures['L01'];
            data.measures.LAC.lighting.measure.tag = 'L01';
            data.measures.LAC.lighting.measure.quantity = n_bulbs_to_change;
            data.measures.LAC.lighting.measure.cost_total = n_bulbs_to_change * data.measures.LAC.lighting.measure.cost;

            data.LAC.LLE = data.LAC.L;
            $('#lighting-measure-applied').show();

            break;
    }

    update();
}
