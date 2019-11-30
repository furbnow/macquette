console.log('debug elements.js');

if (typeof library_helper != "undefined")
    library_helper.type = 'elements';
else
    var library_helper = new libraryHelper('elements', $("#openbem"));

// Deep-clone an object of simple values
const cloneObj = obj => JSON.parse(JSON.stringify(obj))

// Capitalise first letter
const capitalise = str => str.charAt(0).toUpperCase() + str.slice(1)

const isWindow    = type => type.toLowerCase() == 'window'
const isDoor      = type => type.toLowerCase() == 'door'
const isRoofLight = type => type.toLowerCase() == 'roof_light'
const isHatch     = type => type.toLowerCase() == 'hatch'
const isPartyWall = type => type.toLowerCase() == 'party_wall'

const isExternalOpening = type => isWindow(type) || isDoor(type) || isRoofLight(type)
const isOpening         = type => isExternalOpening(type) || isHatch(type)

// button defined in: libraryHelper:elements_library_to_html
$("#openbem").on("click", '.add-element', function () {

    var lib = $(this).attr("lib");
    var type = $(this).attr("type");
    type = capitalise(type);
    var item_id = 1 + get_elements_max_id();
    var library = library_helper.get_library_by_id($(this).attr('library')).data;
    // Create default element
    var element = {type: type, name: type, lib: lib, l: 0, h: 0, area: 0, uvalue: 0, kvalue: 0, wk: 0, id: item_id};
    // If library is defined replace defaults with parameters from library
    if (lib != undefined) {
        for (z in library[lib])
            element[z] = library[lib][z];
    }

    if (isExternalOpening(type)) {
        // Set a default value for orientation and overshading
        element.orientation = 3;
        element.overshading = 2;

        // Set a default value for subtractfrom
        element.subtractfrom = $('.subtractfrom')[0][0].value;
    }

    data.fabric.elements.push(element);
    var newelementid = data.fabric.elements.length - 1;

    if (type == "Wall")
        add_element("#walls", newelementid);
    else if (type == "Roof" || type == "Loft")
        add_element("#roofs", newelementid);
    else if (type == "Floor")
        add_floor(newelementid);
    else if (isOpening(type))
        add_window(newelementid);
    else if (isPartyWall(type))
        add_element("#party_walls", newelementid);

    update();
    $('#myModal').modal('hide');
});

// button defined in: libraryHelper:elements_library_to_html
$("#openbem").on("click", '.change-element', function () {

    var row = $(this).attr("row");
    var lib = $(this).attr("lib");
    var type = $(this).attr("type");
    type = capitalise(type);

    console.log("change element row=" + row + " lib=" + lib);

    var library = library_helper.get_library_by_id($(this).attr('library')).data;

    data.fabric.elements[row].lib = lib;
    if (lib != undefined) {
        for (var z in library[lib]) {
            if (z != 'location')
                data.fabric.elements[row][z] = library[lib][z];
        }
    }

    update();
});

$("#openbem").on("click", '.delete-element', function () {
    var row = $(this).attr('row');
    var item_id = 1.0 * $(this).attr('item_id');
    $(this).closest('tr').remove();
    data.fabric.elements.splice(row, 1);
    elements_initUI();
    update();
});

$("#openbem").on("click", '#apply-measure-TB', function () {
    $('#TB-measure-value').val(data.fabric.thermal_bridging_yvalue);
    $('#apply-measure-TB-modal').modal('show');
});
$("#openbem").on("click", '#apply-measure-TB-modal-ok', function () {
//We only record the original value if this is the first time we apply the measure in this scenario
    if (data.measures.thermal_bridging == undefined) {
        data.measures.thermal_bridging = {
            original_element: {
                value: data.fabric.thermal_bridging_yvalue
            },
            measure: {}
        };
    }

//Apply measure
    data.fabric.thermal_bridging_yvalue = $('#TB-measure-value').val();
    data.measures.thermal_bridging.measure.value = $('#TB-measure-value').val();
    data.measures.thermal_bridging.measure.description = $('#TB-measure-description').val();

    $('#apply-measure-TB-modal').modal('hide');
    elements_initUI();
    update();
});
$("#openbem").on("change", '.floor-uvalue', function () {
    if ($(this).val() == 0)
        $(this).css('color', 'red');
    else
        $(this).css('color', 'black');
});
$("#openbem").on("click", '.apply-bulk-measure', function () {
// We use the modal from the library_helper but we modify it (remove/add buttons) to chang its behaviour
// When we finsih with it -on("click", '#bulk-measure-next'- we leave it as it was originally
    $('#apply-measure-ok').hide();
    $('#apply-measure-modal .modal-footer').append('<button id="bulk-measure-next" tags="' + $(this).attr('tags') + '" class="btn btn-primary">Next</button>');
    library_helper.onApplyMeasure($(this));
    $('#apply-measure-modal').on('hidden.bs.modal', function (e) { // Bind event to tidy up the modal when we dismiss it
        $('#apply-measure-modal .modal-body').show();
        $('#apply-measure-modal #modal-bulk-measure-body').remove();
        $('#bulk-measure-finish').remove();
        $('#bulk-measure-next').remove();
        $('#apply-measure-ok').show();
    });
});
$("#openbem").on("click", '#bulk-measure-next', function () {
// Prepare conten for modal
    var out = '<div id="modal-bulk-measure-body" style="padding: 15px" >';
    out += '<p>Choose elements to appply measures to.</p>';
    out += '<table class="table" style="margin-left:15px">';
    var label = $(this).attr('tags') == 'Window' ? 'Subtract from' : '';
    out += '<tr><th><input type="checkbox" id="bulk-measure-check-all" /></th>\n\
        <th>Name</th><th>Label</th><th>' + label + '</th></tr>';
    if ($(this).attr('tags') == 'Window') { // We sort them by the wall the windows are substrated from
        var window_by_wall = {};
        for (var row in data.fabric.elements) {
            var element = data.fabric.elements[row];
            if (isWindow(element.type)) {
                if (window_by_wall[element.subtractfrom] == undefined)
                    window_by_wall[element.subtractfrom] = [];
                window_by_wall[element.subtractfrom].push({element: element, row: row});
            }
        }
        for (var wall in window_by_wall) { // We display them
            for (var index in window_by_wall[wall]) {
                var element = window_by_wall[wall][index].element;
                if (element.type == $(this).attr('tags')) {
                    out += "<tr><td><input type='checkbox' class='bulk-element' element-row='" + window_by_wall[wall][index].row + "' /></td>";
                    out += '<td>' + element.name + "</td>";
                    out += "<td>" + element.location + "</td>";
                    out += "<td>" + get_element_by_id(element.subtractfrom).location + "</td>";
                    out += '</tr>';
                }
            }
        }
    }
    else {
        for (var row in data.fabric.elements) {
            var element = data.fabric.elements[row];
            if (element.type == $(this).attr('tags')) {
                out += "<tr><td><input type='checkbox' class='bulk-element' element-row='" + row + "' /></td>";
                out += '<td>' + element.name + "</td>";
                out += "<td>" + element.location + "</td>";
                out += "<td></td>";
                out += '</tr>';
            }
        }
    }
    out += '</table>';
    out += '</div>';
    // Add content and buttons, hide what we don't need from the original modal
    $('#apply-measure-modal .modal-body').after($(out));
    $('#apply-measure-modal .modal-body').hide();
    $('#bulk-measure-next').remove();
    $('#apply-measure-modal .modal-footer').append('<button id="bulk-measure-finish" class="btn btn-primary">Finish</button>');
});
$("#openbem").on("click", '#bulk-measure-finish', function () {
    // Check that there is no previous measure applied to each element and if there is then delete it
    $('.bulk-element').each(function (i, obj) { // For each window checked
        if (obj.checked == true) {
            var row = $(obj).attr('element-row');
            var element_id = data.fabric.elements[row].id;
            // applied as single measure
            if (data.fabric.measures[element_id] != undefined)
                delete(data.fabric.measures[element_id]);
            // applied as part of a bulk measure
            var applied_in_bulk = measure_applied_in_bulk(element_id);
            if (applied_in_bulk != false) {
                delete_element_from_bulk_measure(element_id, applied_in_bulk);
            }
        }
    });

    // Create measure
    var measure = library_helper.elements_measures_get_item_to_save();
    for (var lib in measure) {
        measure[lib].lib = lib;
    }
    measure[lib].id = 1 + get_elements_max_id();
    measure[lib].location = '';
    var area = 0;

    // Save original elements
    data.fabric.measures[measure[lib].id] = {};
    data.fabric.measures[measure[lib].id].original_elements = {};
    $('.bulk-element').each(function (i, obj) { // For each window checked
        if (obj.checked == true) {
            var row = $(obj).attr('element-row');
            area += data.fabric.elements[row].netarea;
            measure[lib].location += data.fabric.elements[row].location + ',<br>';
            for (var attr in measure[lib]) {
                var element_id = data.fabric.elements[row].id;
                data.fabric.measures[measure[lib].id].original_elements[element_id] = cloneObj(data.fabric.elements[row]);
            }
        }
    });

    //Apply measure to the selected elements
    $('.bulk-element').each(function (i, obj) {
        if (obj.checked == true) {
            var row = $(obj).attr('element-row');
            add_quantity_and_cost_to_measure(data.fabric.elements[row]); // // We also save the cost of the measure in the element in order to display it inline, see Issue 351
            for (var attr in measure[lib]) {
                if (attr != 'location' && attr != 'id')
                    data.fabric.elements[row][attr] = measure[lib][attr];
            }
            measure[lib].type = data.fabric.elements[row].type; // I know this shouldn't be here, but it is the only place where I can get the type of the element to add it to the measure
        }
    });

    // Save measure and calculate totals
    data.fabric.measures[measure[lib].id].measure = measure[lib];
    add_quantity_and_cost_to_bulk_fabric_measure(measure[lib].id);

    elements_initUI();
    update();

    // Tidy up the apply-measure modal
    $('#apply-measure-modal').modal('hide');
});
$("#openbem").on("change", '#bulk-measure-check-all', function () {
    $('.bulk-element').prop('checked', $('#bulk-measure-check-all')[0].checked);
});
$("#openbem").on("click", '.revert-to-original', function () {
    var element_id = $(this).attr('item_id');
    if (element_exists_in_original(data.created_from, element_id) == true) {
        // copy the original element
        for (var e in project[data.created_from].fabric.elements) {
            if (project[data.created_from].fabric.elements[e].id == element_id) {
                data.fabric.elements[get_element_index_by_id(element_id)] = cloneObj(project[data.created_from].fabric.elements[e]);
                break;
            }
        }
        // delete measure
        var applied_in_bulk = measure_applied_in_bulk(element_id);
        if (applied_in_bulk == false)
            delete(data.fabric.measures[element_id]);
        else
            delete_element_from_bulk_measure(element_id, applied_in_bulk);
    }
    elements_initUI();
    update();
});
$("#openbem").on("click", '.calculate-floor-uvalue', function () {
    var z = $(this).attr('z');
    var area = $('[key="data.fabric.elements.' + z + '.area"]').val();
    var perimeter = $('[key="data.fabric.elements.' + z + '.perimeter"]').val();
    $('#openFUVC-modal #area input').val(area).change();
    $('#openFUVC-modal #perimeter input').val(perimeter).change();
    openFUVC_helper.launch_calculator(function (uvalue) {
        $('[key="data.fabric.elements.' + z + '.uvalue"]').val(uvalue.toFixed(2));
        $('[key="data.fabric.elements.' + z + '.uvalue"]').change();
        if (area == "" || area != $('#openFUVC-modal #area input').val()) {
            var new_area = $('#openFUVC-modal #area input').val();
            $('[key="data.fabric.elements.' + z + '.area"]').val(new_area);
            $('[key="data.fabric.elements.' + z + '.area"]').change();
        }
        if (perimeter == "" || perimeter != $('#openFUVC-modal #perimeter input').val()) {
            var new_perimeter = $('#openFUVC-modal #perimeter input').val();
            $('[key="data.fabric.elements.' + z + '.perimeter"]').val(new_perimeter);
            $('[key="data.fabric.elements.' + z + '.perimeter"]').change();
        }
    });
});
$("#openbem").on("click", '.move-up', function () {
    var original_element = JSON.parse($(this).attr('item'));
    var index_original_element = $(this).attr('row');
    var move = false;
    // Find next item  of the same type up
    for (var i = 1.0 * index_original_element - 1; i >= 0; i--) {
        if (original_element.type == "Wall" || isPartyWall(original_element.type) || original_element.type == "Floor") {
            if (original_element.type == data.fabric.elements[i].type) {
                move = true;
                data.fabric.elements[index_original_element] = cloneObj(data.fabric.elements[i]);
                data.fabric.elements[i] = original_element;
                break;
            }
        }
        else if (original_element.type == "Roof" || original_element.type == "Loft") {
            move = true;
            if (data.fabric.elements[i].type == "Roof" || data.fabric.elements[i].type == "Loft") {
                data.fabric.elements[index_original_element] = cloneObj(data.fabric.elements[i]);
                data.fabric.elements[i] = original_element;
                break;
            }
        }
        else {
            if (isOpening(data.fabric.elements[i].type)) {
                move = true;
                data.fabric.elements[index_original_element] = cloneObj(data.fabric.elements[i]);
                data.fabric.elements[i] = original_element;
                break;
            }
        }
    }
    if (move == true) {
        elements_initUI();
        update();
    }
});
$("#openbem").on("click", '.move-down', function () {
    var original_element = JSON.parse($(this).attr('item'));
    var index_original_element = $(this).attr('row');
    var move = false;
    // Find next item  of the same type up
    for (var i = 1.0 * index_original_element + 1; i < data.fabric.elements.length; i++) {
        if (original_element.type == "Wall" || isPartyWall(original_element.type) || original_element.type == "Floor") {
            if (original_element.type == data.fabric.elements[i].type) {
                move = true;
                data.fabric.elements[index_original_element] = cloneObj(data.fabric.elements[i]);
                data.fabric.elements[i] = original_element;
                break;
            }
        }
        else if (original_element.type == "Roof" || original_element.type == "Loft") {
            move = true;
            if (data.fabric.elements[i].type == "Roof" || data.fabric.elements[i].type == "Loft") {
                data.fabric.elements[index_original_element] = cloneObj(data.fabric.elements[i]);
                data.fabric.elements[i] = original_element;
                break;
            }
        }
        else {
            if (isOpening(data.fabric.elements[i].type)) {
                move = true;
                data.fabric.elements[index_original_element] = cloneObj(data.fabric.elements[i]);
                data.fabric.elements[i] = original_element;
                break;
            }
        }
    }
    if (move == true) {
        elements_initUI();
        update();
    }
});

$("[key='data.fabric.global_TMP']").change(function () {
    value = $("[key='data.fabric.global_TMP']").is(":checked");
    if (value === true)
        $("[key='data.fabric.global_TMP_value']").prop('disabled', false);
    else
        $("[key='data.fabric.global_TMP_value']").prop('disabled', true);
});

// --------------------------------------------------------
// View/redraw code
// --------------------------------------------------------

const selectFabricTemplate = (id, str) =>
    $(`${id} [key='data.fabric.elements.template.${str}']`)

const setFabricTemplateKey = (id, z, str) =>
    selectFabricTemplate(id, str).attr("key", `data.fabric.elements.${z}.${str}`)

function cloneTemplate(id) {
    const template = document.querySelector(id)
    return document.importNode(template.content, true);
}

function setupFabricKeys(root, z)
{
    for (let e of root.querySelectorAll("[data-key]")) {
        const key = e.dataset.key;
        e.setAttribute("key", `data.fabric.elements.${z}.${key}`);
    }
}

function setupFabricCostTotal(root, element) {
    if (element.cost_total === undefined) {
        root.querySelector("[data-section='cost']").remove()
    }
}

function setupFabricButtons(root, z, element)
{
    // We don't allow editing or deleting items except on the master scenario.
    if (scenario === 'master') {
        root.querySelector(".apply-measure").remove()
        root.querySelector(".revert-to-original").remove()
    } else {
        root.querySelector(".edit-item").remove()
        root.querySelector(".delete-element").remove()
    }

    // These are set for the library manager to do its thing
    // see library-helper.js
    for (let e of root.querySelectorAll("[data-action]")) {
        e.setAttribute('row', z);
        e.setAttribute('item_id', element.id);
        e.setAttribute('item', JSON.stringify(element));

        if (element.type != "Loft" && element.type != "Roof")
            e.setAttribute('tags', element.type);
        else
            e.setAttribute('tags', 'Roof,Loft');
    }
}

function add_element(id, z)
{
    const element = data.fabric.elements[z];
    const root = cloneTemplate("#element-template");

    setupFabricKeys(root, z)
    setupFabricCostTotal(root, element)
    setupFabricButtons(root, z, element)

    if (element.EWI !== true && element.cost_total !== undefined) {
        root.querySelector("[data-section='EWI']").remove()
    }

    $(id).append(root);
    init_revert_to_original(id, z);
}

function add_floor(z)
{
    const id = "#floors";
    const element = data.fabric.elements[z];
    const root = cloneTemplate("#floor-template");

    setupFabricKeys(root, z)
    setupFabricCostTotal(root, element)
    setupFabricButtons(root, z, element)

    root.querySelector(".calculate-floor-uvalue").setAttribute("z", z)

    if (element.uvalue == 0) {
        root.querySelector("input.floor-uvalue").classList.add("text-warning");
    }

    $(id).append(root);
    init_revert_to_original(id, z);
}

function add_window(z)
{
    const id = "#windows";
    const element = data.fabric.elements[z];
    $("#windows").append($("#window-template").html());

    setFabricTemplateKey(id, z, 'name');
    setFabricTemplateKey(id, z, 'location');
    setFabricTemplateKey(id, z, 'lib');
    setFabricTemplateKey(id, z, 'description');
    setFabricTemplateKey(id, z, 'subtractfrom');
    setFabricTemplateKey(id, z, 'l');
    setFabricTemplateKey(id, z, 'h');
    setFabricTemplateKey(id, z, 'area');
    setFabricTemplateKey(id, z, 'uvalue');
    setFabricTemplateKey(id, z, 'kvalue');
    setFabricTemplateKey(id, z, 'wk');

    if (!isHatch(element.type)) {
        setFabricTemplateKey(id, z, 'orientation');
        setFabricTemplateKey(id, z, 'overshading');
        setFabricTemplateKey(id, z, 'g');
        setFabricTemplateKey(id, z, 'gL');
        setFabricTemplateKey(id, z, 'ff');
        setFabricTemplateKey(id, z, 'gain');
    }
    else {
        selectFabricTemplate(id, "orientation").parent().html('');
        selectFabricTemplate(id, "overshading").parent().html('');
        selectFabricTemplate(id, "gain").parent().html('');
        $('#windows .window_fields_template').html('');
    }

    if (element.cost_total != undefined)
        selectFabricTemplate(id, "cost_total").attr('key', '').html('<br />£' + element.cost_total).show();
    else
        selectFabricTemplate(id, "cost_total").attr('key', '');

    $('#windows .window_fields_template').removeClass('window_fields_template');
    element.name = String(element.name);
    var name = element.name;
    name = name.toLowerCase();
    if (isDoor(element.type)) {
        $("#windows [key='data.fabric.elements." + z + ".name']").parent().parent().css('background-color', '#ffeeee');
    }
    else if (isRoofLight(element.type)) {
        $("#windows [key='data.fabric.elements." + z + ".name']").parent().parent().css('background-color', '#eeffee');
    }
    else if (isHatch(element.type)) {
        $("#windows [key='data.fabric.elements." + z + ".name']").parent().parent().css('background-color', '#ddeeff');
    }

    const row = $("#windows [row='template']");
    row.attr('row', z);
    row.attr('item_id', element.id);
    row.attr('item', JSON.stringify(element));
    row.attr('tags', element.type);

    var subtractfromhtml = "<option value='no' ></option>";
    for (i in data.fabric.elements) {
        // here
        if (!isOpening(data.fabric.elements[i].type) && data.fabric.elements[i].type != 'Floor')
            subtractfromhtml += "<option value='" + data.fabric.elements[i].id + "'>" + data.fabric.elements[i].location + "</option>";
        //subtractfromhtml += "<option value='" + i + "'>" + data.fabric.elements[i].name + "</option>";
    }
    $("#windows [key='data.fabric.elements." + z + ".subtractfrom']").html(subtractfromhtml);

    init_revert_to_original(id, z);
}

function elements_initUI()
{
    library_helper.type = 'elements';
    if (data.fabric.measures == undefined) // Normally this is done in model-rX.js. The model is intended for calculations so i prefer to initialize data.fabric.measures here
        data.fabric.measures = {};

    // Put the tables in place.
    // Only executes once because of the replaceChild call.  It's really just to avoid
    // duplicating the same markup in the HTML file.
    for (let e of document.querySelectorAll("[data-fabric-table]")) {
        const tbodyId = e.dataset.fabricTable
        const areaKey = e.dataset.areaKey
        const lossKey = e.dataset.lossKey

        const root = cloneTemplate("#element-table-template")

        // Various things need the tbody id to hook off, so we set it here.
        root.querySelector("tbody").setAttribute("id", tbodyId)

        // All element types get a total area set
        root.querySelector("[data-template-area]").setAttribute("key", areaKey)

        // Party walls don't have a total loss for some reason
        if (lossKey) {
            root.querySelector("[data-template-loss]").setAttribute("key", lossKey)
        } else {
            root.querySelector("[data-template-loss]").parentNode.innerHTML = ""
        }

        e.parentNode.replaceChild(root, e)
    }

    $("#walls").html("");
    $("#roofs").html("");
    $("#floors").html("");
    $("#windows").html("");
    $("#party_walls").html("");
    // Initial addition of floors
    for (z in data.fabric.elements) {
        var type = data.fabric.elements[z].type;

        if (type == 'Wall' || type == 'wall') {
            add_element("#walls", z);
        }
        else if (type == 'Floor' || type == 'floor') {
            add_floor(z);
        }
        else if (type == 'Roof' || type == 'roof' || type == 'Loft') {
            add_element("#roofs", z);
        }
        else if (isOpening(type)) {
            add_window(z);
        }
        else if (isPartyWall(type)) {
            add_element("#party_walls", z);
        }
    }

    // Enable/disable dropdown for global TMP
    if (data.fabric.global_TMP === 1)
        $("[key='data.fabric.global_TMP_value']").prop('disabled', false);
    else
        $("[key='data.fabric.global_TMP_value']").prop('disabled', true);
    // Check all the windows, doors, etc are subtracted from somewhere and if not attach them to the first wall, floor, etc from the list. This is a bug fix with backwards compatibility, that's why it's done here
    elements_UpdateUI()
    for (z in data.fabric.elements) {
        if (isOpening(data.fabric.elements[z].type) &&
                data.fabric.elements[z].subtractfrom == undefined) {
            data.fabric.elements[z].subtractfrom = $('.subtractfrom')[0][0].value;
        }
    }

    // Show "Measured applied" in thermal bridge
    if (data.measures != undefined && data.thermal_bridging != undefined)
        $('#TB-measured-applied').show();
}

function elements_UpdateUI()
{
    for (z in data.fabric.elements) {
        let color

        if (isDoor(data.fabric.elements[z].type)) {
            color = '#ffeeee';
        } else if (isRoofLight(data.fabric.elements[z].type)) {
            color = '#ddffdd';
        } else if (isHatch(data.fabric.elements[z].type)) {
            color = '#ddeeff';
        } else {
            color = "#ffffff";
        }

        $("#windows [key='data.fabric.elements." + z + ".name']").parent().parent().css('background-color', color);
    }

    // populate the subtractfrom selects in windows, doors (etc). We do it everytime we update just in case the key that has changed is one of Label/Location
    // Get all the locations (walls, party walls, roofs and lofts
    var options = '';
    for (z in data.fabric.elements) {
        if (!isOpening(data.fabric.elements[z].type) && data.fabric.elements[z].type != "Floor")
            options += "<option value='" + data.fabric.elements[z].id + "'>" + data.fabric.elements[z].location + "</option>";
    }

    $('.revert-to-original-icon').attr('src', urlHelper.static('img/undo.gif'));

    // Fill up the subtractfrom selects
    $('.subtractfrom').each(function (i, obj) {
        $(this).html(options);
    });
}

function get_elements_max_id() {
    var max_id = 0;
    // Find the max id

    for (z in data.fabric.elements) {
        if (data.fabric.elements[z].id != undefined && data.fabric.elements[z].id > max_id)
            max_id = data.fabric.elements[z].id;
    }
    for (z in data.fabric.measures) {
        if (z > max_id)
            max_id = z;
    }
    return (1.0 * max_id);
}

function apply_measure(measure) {
    // Check is a measure has previously been applied as part of a bulk measure, if so then we delete it
    var applied_in_bulk = measure_applied_in_bulk(measure.item_id);
    if (applied_in_bulk != false)
        delete_element_from_bulk_measure(measure.item_id, applied_in_bulk);

    // The first time we apply a measure to an element we record its original stage
    if (data.fabric.measures[measure.item_id] == undefined) { // If it is the first time we apply a measure to this element iin this scenario
        data.fabric.measures[measure.item_id] = {};
        data.fabric.measures[measure.item_id].original_element = cloneObj(data.fabric.elements[measure.row]);
    }

    for (z in measure.item) // measure.item only has one element, we do it this way to the "property", in this case somemthing like "CV1" oof "ROOF1"
        var lib = z;
    switch (measure.type) {
        case 'remove':
            var selector = '[row="' + measure.row + '"]'
            $(selector).closest('tr').remove();
            data.fabric.elements.splice(measure.row, 1);
            data.fabric.measures[measure.item_id].measure = "Element deleted";
            break;
        case  'replace_from_measure_library': // watch out no 'break' at the end of this case
        case 'replace':
        case 'edit':
            measure.item[lib].lib = lib;
            for (z in data.fabric.elements[measure.row]) { // We copy over all the properties that are not asked when applying measures, this are the ones that the user inputed like "length" and "height"
                if (measure.item[lib][z] == undefined)
                    measure.item[lib][z] = data.fabric.elements[measure.row][z];
            }
            add_quantity_and_cost_to_measure(measure.item[lib]);
            //add_quantity_and_cost_to_measure(measure.row); // We also save the cost of the measure in the element in order to display it inline, see Issue 351
            // Update element and add measure
            data.fabric.elements[measure.row] = measure.item[lib];
            data.fabric.measures[measure.item_id].measure = measure.item[lib];
            break;
    }

    elements_initUI();
    update();
}

function edit_item(element, row) {

    for (z in element) {
        var lib = z;
        element[z].lib = z;
    }
    if (element[lib].type == undefined)
        element[lib].type = element[lib].tags[0];
    for (z in data.fabric.elements[row]) { // We copy over all the properties that are not asked when editting an element, this are the ones that the user inputed like "length" and "height"
        if (element[lib][z] == undefined)
            element[lib][z] = data.fabric.elements[row][z];
    }

    data.fabric.elements[row] = element[lib];
    elements_initUI();
    update();
}

function get_element_by_id(id) {
    for (var index in data.fabric.elements) {
        if (data.fabric.elements[index].id == id)
            return data.fabric.elements[index];
    }
}

function get_element_index_by_id(id) {
    for (var index in data.fabric.elements) {
        if (data.fabric.elements[index].id == id)
            return index;
    }
}

function measure_applied_to_element(element_id) {
    for (var measure_id in data.fabric.measures) {
        if (measure_id == element_id)
            return true;
        else if (measure_applied_in_bulk(element_id) != false) {
            return true;
        }
    }
    return false;
}

function element_exists_in_original(original_scenario, element_id) {
    for (e in project[original_scenario].fabric.elements) {
        if (project[original_scenario].fabric.elements[e].id == element_id)
            return true;
    }
    return false;
}

function measure_applied_in_bulk(element_id) { // returns false if measure is not in a bulf measure, returns the measure id if it is
    for (var measure_id in data.fabric.measures) {
        if (data.fabric.measures[measure_id].original_elements != undefined) { // bulk measure
            for (var m in data.fabric.measures[measure_id].original_elements) {
                if (m == element_id)
                    return measure_id;
            }
        }
    }
    return false;
}

function delete_element_from_bulk_measure(element_id, measure_id) {
    delete(data.fabric.measures[measure_id].original_elements[element_id]);
    if (Object.keys(data.fabric.measures[measure_id].original_elements).length == 0)
        delete(data.fabric.measures[measure_id]);
    else  // recalculate cost and quantity
        add_quantity_and_cost_to_bulk_fabric_measure(measure_id);
}

function add_quantity_and_cost_to_bulk_fabric_measure(measure_id) {
    measure_id = 1.0 * measure_id;
    var measure = data.fabric.measures[measure_id].measure;
    measure.quantity = 0;
    measure.cost_total = 0;
    for (var id in data.fabric.measures[measure_id].original_elements) {
        var single_measure = get_element_by_id(id); // Assumes that the measure has already been applied to the element
        add_quantity_and_cost_to_measure(single_measure);
        measure.quantity += single_measure.quantity;
        measure.cost_total += single_measure.cost_total;
    }
}

function init_revert_to_original(id, z) {
    const element = data.fabric.elements[z]
    const $button = $(id + ' .revert-to-original[item_id="' + element.id + '"]');

    if (measure_applied_to_element(element.id) != false) {
        if (data.created_from != undefined && data.created_from != 'master') {
            var inner_html = $button.html();
            inner_html = inner_html.replace(/Revert to master/g, 'Revert to Scenario ' + data.created_from.split('scenario')[1]);
            $button.html(inner_html);
        }
        $button.show();
        if (data.created_from != undefined && element_exists_in_original(data.created_from, element.id) == false)
            $button.removeClass('revert-to-original').css('cursor', 'default').html('Original element doesn\'t<br />exist, cannot revert');
    }
    else {
        $button.hide();
    }
}
