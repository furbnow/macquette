console.log("debug openBEM_version.js");

function openBEM_version_UpdateUI()
{
}

function openBEM_version_initUI() {
    if (p.openbem_version == undefined) {
        $('#model-version').html("10.1.0");
    } else {
        $('#model-version').html(p.openbem_version);
    }

    $.ajax({type: 'GET', url: "https://api.github.com/repos/carboncoop/openBEM/releases", success: function (data) {
            data.forEach(function (release) {
                $('#releases').append("<option value='" + release.tag_name + "'>" + release.name + "</option>");
            });
        }
    });
}


$('#openbem').on('click', '#apply-version', function () {
    p.openbem_version = $('#releases').val();
    mhep_helper.set_openBEM_version(p.id, p.openbem_version, function (result) {
        if (result != false) {
            location.reload();
        }
    });
});
