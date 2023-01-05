import pytest

from .. import reports


def test_basic_html_generation():
    result = reports.render_template(
        template="{{ text }}",
        context={"text": "Friendless raccoons"},
        graph_data={},
    )

    assert result == "Friendless raccoons"


def test_nl2br_filter_produces_brs():
    result = reports.render_template(
        template="{{ text | nl2br }}",
        context={"text": "Friendless\nraccoons\n\nAre not your friends"},
        graph_data={},
    )

    assert result == "<p>Friendless<br>\nraccoons</p>\n\n<p>Are not your friends</p>"


def test_nl2br_filter_handles_apostrophes():
    result = reports.render_template(
        template="{{ text | nl2br }}",
        context={"text": "that's too bad"},
        graph_data={},
    )

    assert result == "<p>that&#39;s too bad</p>"


def test_nl2br_filter_handles_xss():
    result = reports.render_template(
        template="{{ text | nl2br }}",
        context={"text": "<script>alert('hacked');</script>"},
        graph_data={},
    )

    assert result == "<p>&lt;script&gt;alert(&#39;hacked&#39;);&lt;/script&gt;</p>"


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


@pytest.mark.parametrize(
    "data",
    [
        (1, 0.0166666),
        (5, 0.0833333),
        (10, 0.1666666),
        (15, 0.25),
        (20, 0.3333333),
        (25, 0.4166666),
        (30, 0.5),
        (35, 0.5833333),
        (40, 0.6666666),
        (45, 0.75),
        (50, 0.8333333),
        (55, 0.9166666),
        (59, 0.9833333),
    ],
)
def test_to_hours_and_minutes_filter_with_accurate_minutes(data):
    (output, input) = data
    result = reports.render_template(
        template="{{ num | to_hours_and_minutes }}",
        context={"num": input},
        graph_data={},
    )

    assert result == f"{output} minutes"


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
