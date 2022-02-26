import json
import os
import pathlib

import pytest

from mhep.graphs import parse
from mhep.graphs import render


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
    fig, legend = render(parsed)
    return fig
