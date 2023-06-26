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

var pageManager;
var saveManager;

async function initMacquette(api, userId, assessmentId, appName, featureFlags) {
    mhep_helper = api;
    window.features = featureFlags;
    window.appName = appName;
    window.userId = userId;

    projectid = assessmentId;

    const surrounds = await subview('_surrounds');
    document.getElementById('macquette-container').innerHTML = surrounds;

    // Various project initialisation stuff
    p = await mhep_helper.getAssessment(projectid);
    if (p.data == false || p.data == null || Object.keys(p.data).length == 0) {
        p.data = { master: { scenario_name: 'Baseline', modelBehaviourVersion: 3 } };
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

    pageManager = new window.Macquette.PageManager(
        legacyModuleInit,
        legacyModuleInitPostUpdate,
        legacyModuleUpdate,
        legacyModuleUnload
    );

    saveManager = new window.Macquette.SaveManager(
        (data) => mhep_helper.updateAssessment(projectid, data),
        (status) => {
            let text = "";
            switch (status) {
                case "failed":
                    text = "Failed to save";
                    break;
                case "saving":
                    text = "Saving...";
                    break;
                case "saved":
                    text = "Saved";
                    break;
                case "unsaved":
                    text = "Unsaved";
                    break;

            }
            $('#saving_status').text(text)
        },
        (error) => Sentry.captureException(error),
        projectid,
    );

    for (const feature of window.features) {
        $(`[data-hide-if-flag=${feature}]`).hide();
        $(`[data-show-if-flag=${feature}]`).show();
    }
    refresh_undo_redo_buttons();

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
        }
        update();
    });

    $('#modal-error-submitting-data-done').on('click', function () {
        location.reload();
    });
    // Do/undo
    $('body').on('click', '#undo', function () {
        if (historical_index < historical.length - 1) {
            historical_index++;
            p.data = project = JSON.parse(historical[historical_index]);
            update({ undoRedo: true });
        }

        refresh_undo_redo_buttons();
    });
    $('body').on('click', '#redo', function () {
        if (historical_index > 0) {
            historical_index--;
            p.data = project = JSON.parse(historical[historical_index]);
            update({ undoRedo: true });
        }

        refresh_undo_redo_buttons();
    });

    // Allow scrolling the left sidebar out of the way on smaller window sizes
    const sidebarElem = document.querySelector('#editor__sidebar');
    document.addEventListener(
        'scroll',
        () => sidebarElem.style.left = `-${window.pageXOffset}px`
    );
}

function update({ undoRedo = false, dataChanged = true, source } = {}) {
    // We need to calculate the periods of heating off here because if we try to do it in household.js it happens after the update
    if (project.master.household != undefined) {
        for (var s in project) {
            // we ensure all the scenarios have the same household data and heating off periods
            project[s].household = project.master.household;
            project[s].temperature.hours_off = {
                weekday: get_hours_off_weekday(project[s]),
                weekend: get_hours_off_weekend(project[s]),
            };
        }
    }

    if (dataChanged) {
        if (project[scenario] !== undefined) {
            project[scenario] = calc.run(project[scenario]);
            data = project[scenario];
            if (undoRedo === false) {
                historical.splice(0, historical_index); // reset the historical removing all the elements that were still there because of undoing
                historical.unshift(JSON.stringify(project));
                historical_index = 0;
                refresh_undo_redo_buttons();
            }
        }
    }

    pageManager.externalDataUpdate({ source });

    if (dataChanged) {
        saveManager.save({ data: extract_assessment_inputs(project) });
    }
}

function show_hide_if_master() {
    if (scenario == 'master') {
        $('#editor__main-content .if-not-master').hide();
    } else {
        $('#editor__main-content .if-master').hide();
        $('#editor__main-content .disabled-if-not-master').attr('disabled', 'true');
    }
}

function legacyModuleInitPostUpdate() {
    // Add lock functionality to buttons and icons
    if (
        page != 'librariesmanager' &&
        page != 'imagegallery' &&
        page != 'export' &&
        page != 'householdquestionnaire' &&
        page != 'currentenergy' &&
        page != 'commentary' &&
        page != 'report' &&
        page != 'scopeofworks'
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

    show_hide_if_master();

    // Make modals draggable
    $('#openbem .modal-header').css('cursor', 'move');
    $('#openbem .modal').draggable({
        handle: '.modal-header',
    });
}

async function legacyModuleInit() {
    try {
        await load_view('#editor__main-content', page);
    } catch (err) {
        throw new Error(`Failed to load view ${page}: ${err}`);
    }

    const fnName = `${page}_initUI`;
    if (window[fnName] !== undefined) {
        window[fnName]();
    }

    for (const feature of window.features) {
        $(`[data-hide-if-flag=${feature}]`).hide();
        $(`[data-show-if-flag=${feature}]`).show();
    }
}

function legacyModuleUpdate() {
    // Maintain this invariant, for when p.data changes.
    window.project = p.data;

    const fnName = `${page}_UpdateUI`;
    if (window[fnName] !== undefined) {
        window[fnName]();
    }

    legacy_update_page_from_data();

    if (data.locked) {
        $('.if-not-locked').hide();
    } else {
        $('.if-not-locked').show();
    }

    show_hide_if_master();
}

function legacyModuleUnload() {
    const fnName = `${page}_UnloadUI`;
    if (window[fnName] !== undefined) {
        window[fnName]();
    }

    $('#editor__main-content').html('');
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
