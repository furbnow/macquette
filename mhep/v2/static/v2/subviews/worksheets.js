function worksheets_initUI(){
    $('.monthly').each(function () {
        var name = $(this).attr('key');
        var dp = $(this).attr('dp');
        var title = $(this).attr('title');
        var units = $(this).attr('units');

        var out = '';
        var sum = 0;
        for (var m = 0; m < 12; m++) {
            out += "<td key='" + name + '.' + m + "' dp=" + dp + " units='" + units + "'></td>";
            sum += varget(name + '.' + m);
        }
        var mean = sum / 12.0;

        $(this).html('<tr><td>' + title + '</td><td>sum:' + sum.toFixed(dp) + '<br>mean:' + mean.toFixed(dp) + '</td>' + out + '</tr>');
    });
}
