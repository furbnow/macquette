console.log('Debug compare.js');
function compare_initUI() {
    // Summary
    $('#summary').append(generateSummary());

    // Comparison tables
    for (var scenario in project) {
        if (scenario != 'master') {
            $('#compare').append('<h3 style="margin-top:25px">Master/' + scenario + ' Comparison table</h4>');
            $('#compare').append('<hr />');
            $('#compare').append('<div id="comparison-' + scenario + '" style="margin-left:25px">');
            $('#comparison-' + scenario).html(compareCarbonCoop(scenario));
        }
    }

    // Summary of measures
    for (var scenario in project) {
        if (scenario != 'master') {
            $('#summary-measures').append('<h3 style="margin-top:25px">' + scenario.charAt(0).toUpperCase() + scenario.slice(1) + ' - summary of measures</h4>');
            $('#summary-measures').append('<hr />');
            $('#summary-measures').append('<div id="summary-measures-' + scenario + '" style="margin-left:25px">');
            $('#summary-measures-' + scenario).append(getMeasuresSummaryTable(scenario));
        }
    }
    $('.measures-summary-table').addClass('table');

    // Complete measures tables
    for (var scenario in project) {
        if (scenario != 'master') {
            $('#complete-measures').append('<h3 style="margin-top:25px">' + scenario.charAt(0).toUpperCase() + scenario.slice(1) + ' - comple list of measures</h4>');
            $('#complete-measures').append('<hr />');
            $('#complete-measures').append('<div id="complete-measures-' + scenario + '" style="margin-left:25px">');
            $('#complete-measures-' + scenario).append(getMeasuresCompleteTables(scenario));
        }
    }
    $('.complete-measures-table').addClass('table');
    $('#complete-measures').hide(); // We don't want to show this one for now
}
