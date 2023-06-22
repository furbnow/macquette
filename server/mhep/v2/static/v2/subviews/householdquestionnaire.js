console.log('debug householdquestionnaire.js');

function householdquestionnaire_initUI() {
    data = project['master'];
    data.household = data.household || {};
}

function householdquestionnaire_UpdateUI() {
    if (data.temperature.hours_off.weekday.length > 0) {
        let text = data.temperature.hours_off.weekday
            .filter(elem => elem != null && elem != 0)
            .map(elem => elem.toFixed(1) + 'h')
            .join(', ');

        $('#periods_heating_off_weekday').html(text);
    }

    if (data.temperature.hours_off.weekend.length > 0) {
        let text = data.temperature.hours_off.weekend
            .filter(elem => elem != null && elem != 0)
            .map(elem => elem.toFixed(1) + 'h')
            .join(', ');

        $('#periods_heating_off_weekend').html(text);
    }

    let csv = export_csv();
    document.getElementById('get_csv').setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(csv));
    document.getElementById('get_csv').setAttribute('download', 'householder_qs.csv');
}

$('#process_csv').click(function (e) {
    let file = document.querySelector('#csv_file').files[0];
    let reader = new FileReader();

    reader.onload = function() {
        let parsed = Papa.parse(reader.result, {skipEmptyLines: true});

        if (parsed.errors.length > 0) {
            let errors = parsed.errors
                .map(err => `${err.message} (row ${error.row})`)
                .join('<br>');

            $('#csv-result').css('color', 'red').html('There was a problem processing the file:' + error_string);
            console.error(parsed);
        } else {
            errors = import_csv(parsed.data);
            update();
            if (errors.length > 0) {
                $('#csv-result').css('color', 'red').html('Questionnaire imported with errors:<br>' + errors.join('<br>'));
            } else {
                $('#csv-result').css('color', 'black').html('Questionnaire imported');
            }
        }
    };

    reader.readAsText(file);
});

function export_csv() {
    let contents = [];

    contents.push(',,,For multiple choice answers please place an X in column B against the correct choice');
    contents.push('Field,Type,Answer');

    for (let [name, type] of Object.entries(qfields)) {
        let friendly = type.friendly;

        // For questions with multiple choices, we output a list of the choices and
        // allow the user to put an 'X' next to the right one.
        if (type.table) {
            let first = true;
            for (let [optk, optv] of Object.entries(type.table)) {
                let current = project.master.household[name] == optk ? 'X' : '';
                contents.push(`${first ? name : ''},${friendly},${current},${optv}`);
                first = false;
            }
        } else {
            let current;

            // We have to do some work to redress the broken underlying model that
            // MHEP uses here.  Sometimes true is 1 or true or "YES".  XXX
            // The way to fix this is to make the questionnaire use its own listen
            // handlers rather than 'key', and use the table of fields above to set up
            // the data store correctly.  One day.
            if (type.type == 'yesno') {
                let r = qtype.yesno.parse(project.master.household[name]);
                if (r.type === 'FAILED') {
                    current = '';
                } else if (r.val === true) {
                    current = 'yes';
                } else if (r.val === false) {
                    current = 'no';
                } else {
                    current = '';
                }
            } else {
                current = project.master.household[name] || '';
            }

            contents.push(`${name},${friendly},${current}`);
        }
    }

    return contents.join('\n');
}

function import_csv(rows) {
    const COL_KEY = 0;
    const COL_ANSWER = 2;
    const COL_CHOICES = 3;

    let errors = [];

    // We keep the key out of the loop because it's only on the first row of multi-row
    // choices
    let key = null;

    for (let row of rows) {
        // Skip over rows with nothing for field name (if no current key)
        if (!key && !row[COL_KEY]) {
            continue;
        }

        // If there's a new field name, try using it
        if (row[COL_KEY]) {
            // if it's unknown, skip and reset the key
            if (!(row[COL_KEY] in qfields)) {
                key = null;
                continue;
            } else {
                // Otherwise accept it as the new key
                key = row[COL_KEY];
            }
        }

        // If we get here then we always have a key.

        // If there is no value then we don't overwrite
        if (row[COL_ANSWER] == '') {
            continue;
        }

        let val = row[COL_ANSWER];
        if (qfields[key].table) {
            // If we have a choices table then we use the 'choices' field rather than
            // the 'answer', which is just an 'X'.  Only fields with 'X' in them get
            // to this point, because we skipped over empty answers earlier.
            val = row[COL_CHOICES];
        }

        let res = qfields[key].parse(val);
        if (res.type == 'SUCCESS') {
            project.master.household[key] = res.val;
        } else {
            errors.push(`Couldn't understand ${key} ("${val}")`);
        }
    }

    return errors;
}
