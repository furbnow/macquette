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


def test_to_hours_and_minutes_filter_with_no_minutes():
    result = reports.render_template(
        template="{{ 4 | to_hours_and_minutes }}",
        context={},
        graph_data={},
    )

    assert result == "4 hours"


def test_to_hours_and_minutes_filter_with_minutes():
    result = reports.render_template(
        template="{{ 4.5 | to_hours_and_minutes }}",
        context={},
        graph_data={},
    )

    assert result == "4 hours 30 minutes"


def test_to_hours_and_minutes_filter_with_few_minutes():
    result = reports.render_template(
        template="{{ 4.1 | to_hours_and_minutes }}",
        context={},
        graph_data={},
    )

    assert result == "4 hours 5 minutes"


def test_graph_rendering_gives_a_data_url():
    result = reports.render_template(
        template="{{ graphs.tester.url }}",
        context={},
        graph_data={
            "tester": {
                "numCategories": 1,
                "bins": [
                    {"data": [0], "label": "Nowt"},
                ],
                "type": "bar",
                "units": "n/a",
            }
        },
    )

    assert result.startswith("data:")
