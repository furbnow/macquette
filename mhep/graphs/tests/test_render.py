import json
import os
import pathlib

import pytest

from mhep.graphs import parse
from mhep.graphs import render
from mhep.graphs import types


INPUT_DIR = pathlib.Path(__file__).parent.resolve() / "render_input"
INPUT_FILES = os.listdir(INPUT_DIR)

INPUTS = []
for filename in INPUT_FILES:
    with open(INPUT_DIR / filename) as file:
        INPUTS.append(str(file.read()))


@pytest.mark.mpl_image_compare(
    savefig_kwargs={"dpi": 300},
    baseline_dir="render_output",
    style="default",
)
@pytest.mark.parametrize("data", INPUTS, ids=INPUT_FILES)
def test_against_saved_image(data):
    """Use pytest-mpl to compare the output from the code with the saved PNGs."""
    json_obj = json.loads(data)
    parsed = parse(json_obj)
    fig, key = render(parsed)
    return fig


def test_report_key_omits_unused_labels():
    from mhep.graphs.render import DEFAULT_COLOURS

    chart = types.BarChart(
        type="bar",
        units="none",
        categoryLabels=["French", "German", "Mauritian"],
        bins=[
            {"label": "Fnargle", "data": [0, 0, 100]},
            {"label": "Fnord", "data": [100, 0, 0]},
        ],
    )
    _, key = render(chart)

    assert key == [
        ("French", DEFAULT_COLOURS[0]),
        ("Mauritian", DEFAULT_COLOURS[2]),
    ]
