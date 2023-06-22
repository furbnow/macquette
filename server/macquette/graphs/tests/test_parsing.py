import pytest

from macquette.graphs import parse


def test_empty_bar_chart_is_disallowed():
    input = {
        "type": "bar",
        "units": "none",
        "numCategories": 0,
        "bins": [],
    }

    with pytest.raises(ValueError) as excinfo:
        parse(input)

    assert "must have some data" in str(excinfo.value)


def test_mismatching_number_of_categories_in_a_bin():
    input = {
        "type": "bar",
        "units": "none",
        "numCategories": 2,
        "bins": [
            {
                "label": "1",
                "data": [0],
            }
        ],
        "categoryLabels": ["Cat 1", "Cat 2"],
    }

    with pytest.raises(ValueError) as excinfo:
        parse(input)

    assert "Bin '1' should have 2 item(s) of data" ", but instead it has 1" in str(
        excinfo.value
    )


def test_mismatching_number_of_category_colours():
    input = {
        "type": "bar",
        "units": "none",
        "numCategories": 2,
        "bins": [
            {
                "label": "1",
                "data": [0, 2],
            }
        ],
        "categoryLabels": ["Cat 1", "Cat 2"],
        "categoryColours": ["#feefee"],
    }

    with pytest.raises(ValueError) as excinfo:
        parse(input)

    assert "Should have 2 category colours but 1 provided" in str(excinfo.value)


def test_mismatching_number_of_category_labels():
    input = {
        "type": "bar",
        "units": "none",
        "numCategories": 1,
        "bins": [
            {
                "label": "1",
                "data": [0],
            }
        ],
        "categoryLabels": ["Cat 1", "Cat 2"],
    }

    with pytest.raises(ValueError) as excinfo:
        parse(input)

    assert "Should have 1 category labels but 2 provided" in str(excinfo.value)


def test_mixed_positive_and_negative_within_same_category():
    input = {
        "type": "bar",
        "stacked": True,
        "units": "none",
        "numCategories": 2,
        "bins": [
            {
                "label": "One",
                "data": [10, -1],
            },
            {
                "label": "Two",
                "data": [11, 1],
            },
        ],
    }

    with pytest.raises(ValueError) as excinfo:
        parse(input)

    assert "Mixed positive and negative values in category index 1" in str(
        excinfo.value
    )


def test_mixed_positive_and_negative_within_same_category_with_mismatching_number_of_categories():
    input = {
        "type": "bar",
        "stacked": True,
        "units": "none",
        "numCategories": 3,
        "bins": [
            {
                "label": "One",
                "data": [10, 2, 3],
            },
            {
                "label": "Two",
                "data": [11],
            },
        ],
    }

    with pytest.raises(ValueError) as excinfo:
        parse(input)

    assert "Bin 'Two' should have 3 item(s) of data" in str(excinfo.value)


def test_bad_colours():
    input = {
        "type": "bar",
        "units": "none",
        "numCategories": 2,
        "bins": [
            {
                "label": "1",
                "data": [0, 2],
            }
        ],
        "categoryLabels": ["Cat 1", "Cat 2"],
        "categoryColours": ["#ffffff", "#0033az"],
    }

    with pytest.raises(ValueError) as excinfo:
        parse(input)

    assert "invalid colour" in str(excinfo.value).lower()
