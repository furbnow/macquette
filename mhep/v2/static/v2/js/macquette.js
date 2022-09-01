var selected_library = -1;
var selected_library_tag = 'Wall';
var page;
var scenario;
var data = {};
var keys = {};

var mhep_helper;
var library_helper;

var historical = [];
var historical_index;

var projectid;
var p;
var project;

async function initMacquette(api, assessmentId, featureFlags) {
    mhep_helper = api;
    window.features = featureFlags;

    projectid = assessmentId;

    const surrounds = await subview('_surrounds');
    document.getElementById('macquette-container').innerHTML = surrounds;

    // Load house graphic + stats
    load_view('#topgraphic', 'topgraphic').catch((err) => {
        console.error(`Failed to load topgraphic: ${err}`);
        alert('Failed to load top graphic');
    });

    // Various project initialisation stuff
    p = await mhep_helper.getAssessment(projectid);
    if (p.data == false || p.data == null || Object.keys(p.data).length == 0) {
        p.data = { master: { scenario_name: 'Baseline', modelBehaviourVersion: 2 } };
    }
    project = p.data;
    if (project.master.fuels === undefined) {
        // project.master.fuels = JSON.parse(JSON.stringify(datasets.fuels));
        project.master.fuels = window.Macquette.emulateJsonRoundTrip(datasets.fuels);
    }
    for (let s in project) {
        project[s].fuels = project.master.fuels;
        project[s] = calc.run(project[s]);
    }

    library_helper = new libraryHelper('', $('#openbem'));

    load_page_from_hash();
    redraw_scenario_menu();
    toggle_scenario_menu(scenario);
    refresh_undo_redo_buttons();

    // Don't show reports to people who can't issue reports to avoid confusion
    if (!p.organisation) {
        $('[href="#master/report"]').hide();
    }

    $('#project-title').html(p.name);
    $('#project-description').html(p.description);
    if (p.organisation) {
        $('#project-author').html(`${p.owner.name}, ${p.organisation.name}`);
    } else {
        $('#project-author').html(`by ${p.owner.name}`);
    }

    // Initialize undo functionality
    // pointer for the historical array, pointing the current version of project
    historical.unshift(JSON.stringify(project));
    historical_index = 0;

    // Warn users of locking
    if (p.status === 'Complete') {
        setTimeout(function () {
            $('#modal-assessment-locked').modal('show');
        }, 1);
    }

    setupEventHandlers();
}

function setupEventHandlers() {
    $('#openbem').on('click', '.lock', function () {
        const id = this.dataset.scenario;
        project[id].locked = !project[id].locked;

        if (project[id].locked) {
            $('.if-not-locked').hide();
        } else {
            $('.if-not-locked').show();
        }

        redraw_scenario_menu();

        // Disable measures if master
        show_hide_if_master();

        update();
    });
    $('#openbem').on('change', '[key]', function () {
        if (
            data.locked == true &&
            page != 'librariesmanager' &&
            page != 'imagegallery' &&
            page != 'export' &&
            page != 'householdquestionnaire' &&
            page != 'currentenergy' &&
            page != 'commentary'
        ) {
            $('#modal-scenario-locked').modal('show');
        } else {
            var key = $(this).attr('key');
            var val = $(this).val();
            var input_type = $(this).attr('type');
            if (input_type == 'checkbox') {
                val = $(this)[0].checked;
            }
            if (input_type == 'textarea') {
                val = $(this).html();
            }

            // Number fields should never end up with the empty string, but should
            // be 0 instead
            if (input_type === 'number' && val === '') {
                val = 0;
            }

            if (!isNaN(val) && val != '') {
                val *= 1;
            }

            if (key == 'data.use_SHW') {
                data.water_heating.solar_water_heating = val;
            }
            var lastval = varset(key, val);

            $('#openbem').trigger('onKeyChange', { key: key, value: val });

            console.log(key + ' changed from ' + lastval + ' to ' + val);

            if (key.endsWith('.scenario_name')) {
                redraw_scenario_menu();
            }
        }
        update();
    });
    $(window).on('hashchange', function () {
        load_page_from_hash();
    });
    $('.house_graphic').click(function () {
        if ($('.house_graphic').html() == 'Show house graphic') {
            show_house_graphic();
        } else {
            hide_house_graphic();
        }
    });
    // Scenarios interactions
    $('#openbem').on('click', '.scenario-nav', function () {
        $(window).scrollTop(650);
    });
    $('#openbem').on('click', '.scenario-block .block-header', function () {
        const project_id = this.closest('[scenario]').getAttribute('scenario');

        if (project_id !== scenario) {
            window.location = '#' + project_id + '/' + page;
            $(window).scrollTop(0);
        }

        toggle_scenario_menu(project_id);
    });
    $('#openbem').on('click', '.project-menu-item', function () {
        $('.scenario-block[scenario=master] .block-header').click();
        toggle_scenario_menu(null);
        $(window).scrollTop(0);
    });
    // Scenarios management
    $('#openbem').on('click', '#create-new', function () {
        // Reset select
        $('#select-scenario').html('');

        // Fill up the select
        for (z in project) {
            const name = project[z].scenario_name || z;
            $('#select-scenario').append(`<option value='${z}'>${name}</option>`);
        }

        $('#modal-create-scenario').modal('show');
    });
    $('#modal-create-scenario').on('click', '#modal-create-scenario-done', function () {
        var n = 0;
        for (z in project) {
            var scenario_number = z.slice(8);
            if (z != 'master' && n != scenario_number) {
                // if for a reason a scenario was deleted, when we create a new one it takes its position. Example: we have master, scenario1 and scenario2. We delete scenario1. We create a new one that becomes scenario1
                break;
            }
            n++;
        }
        var s = 'scenario' + n;
        // project[s] = JSON.parse(JSON.stringify(project[$('#select-scenario').val()]));
        project[s] = window.Macquette.emulateJsonRoundTrip(project[$('#select-scenario').val()]);
        project[s].locked = false;
        project[s].creation_hash = generate_hash(JSON.stringify(project[s]));
        project[s].measures = {};
        project[s].fabric.measures = {};
        for (const element of project[s].fabric.elements) {
            delete element.cost_total;
        }
        project[s].created_from = $('#select-scenario').val();

        //sort project alphabetically
        temp_project = {};
        Object.keys(project)
            .sort()
            .forEach(function (v, i) {
                temp_project[v] = project[v];
            });
        // p.data = project = JSON.parse(JSON.stringify(temp_project));
        p.data = project = window.Macquette.emulateJsonRoundTrip(temp_project);

        $('.menu-content').hide();
        redraw_scenario_menu();
        $('#modal-create-scenario').modal('hide');

        scenario = s;
        page = 'context';
        update();
        $('.scenario-block[scenario=' + s + '] .block-header').click();
        $(window).scrollTop(0);
    });
    $('#openbem').on('click', '.delete-scenario-launch', function () {
        const id = this.dataset.scenario;

        if (id != 'master') {
            $('#modal-delete-scenario').modal('show');
            $('#modal-delete-scenario').attr('scenario', id);
        }
    });
    $('#delete-scenario-confirm').click(function () {
        var s = $('#modal-delete-scenario').attr('scenario');

        if (s != 'master') {
            delete project[s];
        }
        $(`.scenario-block[scenario=${s}] .block-header`).hide();
        scenario = 'master';
        page = 'context';

        update();
        $('#modal-delete-scenario').modal('hide');
        $('.scenario-block[scenario=master] .block-header').click();
        $(window).scrollTop(0);
    });
    // Project's name and description management
    $('#edit-project-name-and-description').on('click', function () {
        $('#project-name-input').val(p.name);
        $('#project-description-input').val(p.description);
        $('#modal-edit-project-name-and-description').modal('show');
    });
    $('#assessment-update-name-and-description').on('click', function () {
        p.name = $('#project-name-input').val();
        p.description = $('#project-description-input').val();
        $('#project-title').html(p.name);
        $('#project-description').html(p.description);
        $('#modal-edit-project-name-and-description').modal('hide');
        mhep_helper.updateAssessment(projectid, {
            name: p.name,
            description: p.description,
        });
    });
    $('#modal-error-submitting-data-done').on('click', function () {
        location.reload();
    });
    // Do/undo
    $('body').on('click', '#undo', function () {
        if (historical_index < historical.length - 1) {
            historical_index++;
            p.data = project = JSON.parse(historical[historical_index]);
            update(true);
        }

        refresh_undo_redo_buttons();
    });
    $('body').on('click', '#redo', function () {
        if (historical_index > 0) {
            historical_index--;
            p.data = project = JSON.parse(historical[historical_index]);
            update(true);
        }

        refresh_undo_redo_buttons();
    });
    // Side menu
    $(window).resize(function () {
        draw_openbem_graphics('#topgraphic', data);
    });

    // Allow scrolling the left sidebar out of the way on smaller window sizes
    const sidebarElem = document.querySelector('#editor__sidebar');
    document.addEventListener(
        'scroll',
        () => sidebarElem.style.left = `-${window.pageXOffset}px`
    );
}

function update(undo_redo = false) {
    // We need to calculate the periods of heating off here because if we try to do it in household.js it happens after the update
    if (project.master.household != undefined) {
        for (var s in project) {
            // we ensure all the scenarios have the same household data and heating off periods
            project[s].household = project.master.household;
            project[s].temperature.hours_off.weekday = get_hours_off_weekday(project[s]);
            project[s].temperature.hours_off.weekend = get_hours_off_weekend(project[s]);
        }
    }

    project[scenario] = calc.run(project[scenario]);
    data = project[scenario];
    if (undo_redo === false) {
        historical.splice(0, historical_index); // reset the historical removing all the elements that were still there because of undoing
        historical.unshift(JSON.stringify(project));
        historical_index = 0;
        refresh_undo_redo_buttons();
    }

    UpdateUI(data);
    draw_openbem_graphics('#topgraphic', data);

    redraw_emissions();

    $('#saving_status').text('Saving...');

    const inputs = extract_assessment_inputs(project);
    mhep_helper.updateAssessment(projectid, { data: inputs }).then(() => {
        $('#saving_status').text('Saved');
    }).catch(err => {
        $('#saving_status').text('Failed to save');
    });
}

function hide_house_graphic() {
    $('#topgraphic').hide();
    $('.house_graphic').html('Show house graphic');
}

function show_house_graphic() {
    $('#topgraphic').show();
    $('.house_graphic').html('Hide house graphic');
}

function show_hide_if_master() {
    if (scenario == 'master') {
        $('#editor__main-content .if-not-master').hide();
    } else {
        $('#editor__main-content .if-master').hide();
        $('#editor__main-content .disabled-if-not-master').attr('disabled', 'true');
    }
}

function has_changed_base_scenario(scenario_id) {
    const creation_hash = project[scenario_id].creation_hash;
    if (!creation_hash) {
        return false;
    }

    const created_from = project[scenario_id].created_from;
    // let original_scenario = JSON.parse(JSON.stringify(project[created_from]));
    let original_scenario = window.Macquette.emulateJsonRoundTrip(project[created_from]);
    original_scenario.locked = false;
    let current_hash = generate_hash(JSON.stringify(original_scenario));

    return creation_hash != current_hash;
}

function scenario_block(id, currently_open) {
    const title = project[id].scenario_name || id.charAt(0).toUpperCase() + id.slice(1);
    const locked = project[id].locked;
    const menu_class = id === currently_open ? 'active' : '';
    const is_master = id === 'master';
    const created_from =
        project[id].created_from == 'master' ? 'baseline' : project[id].created_from;

    let created_from_html = '';
    if (created_from) {
        let created_from_extra = '';
        let created_from_title = '';

        if (project[created_from] == undefined && created_from != 'baseline') {
            // If the parent scenario has been deleted
            created_from_extra = ' - deleted';
        } else if (has_changed_base_scenario(id)) {
            created_from_extra = '*';
            created_from_title = `title="${created_from} has changed since the creation of ${title}"`;
        }

        created_from_html = `<span style="font-weight: normal" ${created_from_title}>Based on ${created_from}${created_from_extra}</span>`;
    }

    return `
    <div class="side-block scenario-block" scenario="${id}">
        <div class="block-header block-header--clickable" style="display: flex; justify-content: space-between;">
            <div>
                ${title}
                ${locked ? '<i class="icon-lock"></i>' : ''}
                <br>
                ${created_from_html}
            </div>

            <div style="text-align: right; font-weight: normal" class="shd"></div>
        </div>

        <div class="menu-content" class="${menu_class}">
            <div class="side-section" style="margin-top: 10px">
                <ul>
                    <li><a href="#${id}/context">Basic Dwelling Data</a></li>
                    <li><a href="#${id}/ventilation">Ventilation and Infiltration</a></li>
                    <li><a href="#${id}/elements">Fabric</a></li>
                    <li><a href="#${id}/LAC">Lighting, Appliances & Cooking</a></li>
                    <li><a href="#${id}/heating">Heating</a></li>
                    <li><a href="#${id}/fuel_requirements">Fuel requirements</a></li>
                    <li><a href="#${id}/generation">Generation</a></li>
                    <li><a href="#${id}/solarhotwater">Solar Hot Water heating</a></li>
                    <!-- <li><a href="#${id}/sandbox">Sandbox</a></li> -->
                </ul>
            </div>

            <div class="side-section">
                <div class="side-section--header">Other</div>
                    <ul>
                    <li><a href="#${id}/worksheets">SAP worksheets</a></li>
                    <li>
                        <button class="lock" data-scenario="${id}">
                            ${locked ? 'Unlock scenario' : 'Lock scenario'}
                        </button>
                    </li>

                    <li ${is_master ? 'hidden' : ''}>
                        <button class="delete-scenario-launch" data-scenario="${id}">
                            <i class="icon-trash"></i>
                            Delete scenario
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    </div>
    `;
}

function redraw_scenario_menu() {
    const currently_open = $('[scenario] .menu-content')
        .filter('.active')
        .closest('[scenario]')
        .attr('scenario');

    $('#scenario-list').html(
        Object.keys(project)
            .map((id) => scenario_block(id, currently_open))
            .join(''),
    );

    toggle_scenario_menu(currently_open);

    redraw_emissions();
}

function redraw_emissions() {
    for (let s in project) {
        const $emissions = $(`[scenario="${s}"] .shd`);
        const space_heating_demand_m2 = project[s].space_heating_demand_m2;
        if (
            typeof space_heating_demand_m2 == 'number' &&
            !isNaN(space_heating_demand_m2)
        ) {
            $emissions.html(space_heating_demand_m2.toFixed(0));
        } else {
            $emissions.html('-');
        }
    }
}

function init_page_header() {
    if (
        page == 'report' ||
        page == 'householdquestionnaire' ||
        page == 'commentary' ||
        page == 'scopeofworks' ||
        page == 'currentenergy' ||
        page == 'imagegallery'
    ) {
        hide_house_graphic();
    } else {
        show_house_graphic();
        draw_openbem_graphics('#topgraphic', data);
    }

    if (page == 'householdquestionnaire') {
        $('.scenario-name').html('Household Questionnaire');
    } else if (page == 'commentary') {
        $('.scenario-name').html('Commentary');
    } else if (page == 'report') {
        $('.scenario-name').html('Generate Report');
    } else if (page == 'currentenergy') {
        $('.scenario-name').html('Current Energy');
    } else if (page == 'imagegallery') {
        $('.scenario-name').html('Image Gallery');
    } else {
        $('.scenario-name').html(scenario.charAt(0).toUpperCase() + scenario.slice(1) + ' - ' + data.scenario_name);
    }
}

function legacy_page_setup() {
    // Add lock functionality to buttons and icons
    if (
        page != 'librariesmanager' &&
        page != 'imagegallery' &&
        page != 'export' &&
        page != 'householdquestionnaire' &&
        page != 'currentenergy' &&
        page != 'commentary' &&
        page != 'report'
    ) {
        $('#editor__main-content button').addClass('if-not-locked');
        $('#editor__main-content i').addClass('if-not-locked');
        $('#editor__main-content .revert-to-original').each(function () {
            if ($(this).css('display') != 'none') {
                $(this).addClass('if-not-locked');
            }
        });
    }

    if (data.locked) {
        $('.if-not-locked').hide();
    } else {
        $('.if-not-locked').show();
    }

    // Disable measures if master
    show_hide_if_master();

    // Make modals draggable
    $('#openbem .modal-header').css('cursor', 'move');
    $('#openbem .modal').draggable({
        handle: '.modal-header',
    });
}

function load_page_from_hash() {
    let oldPage = page;
    let oldScenario = scenario;

    var tmp = window.location.hash.substring(1).split('/');
    page = tmp[1] || 'context';
    scenario = tmp[0] || 'master';

    if (project[scenario] == undefined) {
        scenario = 'master';
    }

    if (oldPage === page && oldScenario === scenario) {
        return;
    }

    // Unload previous view
    if (oldPage && oldScenario) {
        var functionname = oldPage + '_UnloadUI';
        if (window[functionname] != undefined) {
            window[functionname]();
        }
    }

    data = project[scenario];

    // Render page
    load_view('#editor__main-content', page)
        .catch((err) => {
            console.error(`Failed to load view ${page}`, err);
        })
        .then(() => {
            init_page_header();

            var functionname = page + '_initUI';
            if (window[functionname] != undefined) {
                window[functionname]();
            }

            UpdateUI(data);

            legacy_page_setup();
        });
}

function refresh_undo_redo_buttons() {
    if (historical_index == historical.length - 1) {
        $('#undo').css('opacity', 0.1);
        $('#undo').css('cursor', 'default');
    } else {
        $('#undo').css('opacity', 1);
        $('#undo').css('cursor', 'pointer');
    }

    if (historical_index > 0) {
        $('#redo').css('opacity', 1);
        $('#redo').css('cursor', 'pointer');
    } else {
        $('#redo').css('opacity', 0.1);
        $('#redo').css('cursor', 'default');
    }
}

function generate_hash(string) {
    var hash = 0,
        i,
        chr;
    if (string.length === 0) {
        return hash;
    }
    for (i = 0; i < string.length; i++) {
        chr = string.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

function toggle_scenario_menu(project_id) {
    const $menu_content = $(`div[scenario="${project_id}"] .menu-content`);
    const visible = $menu_content.hasClass('active');

    $('.menu-content').removeClass('active');
    if (!visible) {
        $menu_content.addClass('active');
    }
}
