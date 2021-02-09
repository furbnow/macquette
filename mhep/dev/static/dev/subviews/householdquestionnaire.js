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

    let csv = questionnaire_export_csv();
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
            errors = questionnaire_import_csv(parsed.data);
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
