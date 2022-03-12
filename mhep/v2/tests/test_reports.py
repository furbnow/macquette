from .. import reports


def test_basic_html_generation():
    result = reports.render_template(
        template="{{ text }}",
        context={"text": "Friendless raccoons"},
        graph_data={},
    )

    assert result == "Friendless raccoons"


def test_nl2br_filter():
    result = reports.render_template(
        template="{{ text | nl2br }}",
        context={"text": "Friendless\nraccoons\n\nAre not your friends"},
        graph_data={},
    )

    assert result == "<p>Friendless<br>\nraccoons</p>\n\n<p>Are not your friends</p>"


def test_sqrt_filter():
    result = reports.render_template(
        template="{{ 4 | sqrt }}",
        context={},
        graph_data={},
    )

    assert result == "2.0"


def test_graph_rendering_gives_a_data_url():
    result = reports.render_template(
        template="{{ graphs.tester.url }}",
        context={},
        graph_data={
            "tester": {
                "bins": [
                    {"data": [0], "label": "Nowt"},
                ],
                "type": "bar",
                "units": "n/a",
            }
        },
    )

    assert result.startswith("data:")
