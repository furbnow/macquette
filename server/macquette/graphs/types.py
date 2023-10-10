import re
from dataclasses import dataclass, field
from typing import Literal

import typedload


@dataclass
class Bin:
    label: str
    data: list[float]


@dataclass
class Line:
    value: float
    label: str


@dataclass
class ShadedArea:
    interval: tuple[float, float]
    label: str | None = None


@dataclass
class BarChart:
    type: Literal["bar"]
    units: str
    bins: list[Bin]
    num_categories: int = field(metadata={"name": "numCategories"})
    category_labels: list[str] | None = field(
        default=None, metadata={"name": "categoryLabels"}
    )
    category_colours: list[str] | None = field(
        default=None, metadata={"name": "categoryColours"}
    )
    lines: list[Line] | None = None
    areas: list[ShadedArea] | None = None
    stacked: bool | None = False

    def reversed_data_by_category(self) -> list[list[float]]:
        """Convert data from being per-bin into being per-category (backwards)."""
        return [
            list(reversed([bin.data[idx] for bin in self.bins]))
            for idx in range(self.num_categories)
        ]

    def data_by_category(self) -> list[list[float]]:
        """Convert data from being per-bin into being per-category."""
        return [
            [bin.data[idx] for bin in self.bins] for idx in range(self.num_categories)
        ]


@dataclass
class Axis:
    units: str


@dataclass
class LineRow:
    label: str
    data: list[list[float]]


@dataclass
class LineGraph:
    type: Literal["line"]
    x_axis: Axis = field(metadata={"name": "xAxis"})
    y_axis: Axis = field(metadata={"name": "yAxis"})
    rows: list[LineRow]


def _check_colours_are_valid(bar: BarChart):
    if not bar.category_colours:
        return

    valid = r"^#[a-f0-9]{6}$"
    for colour in bar.category_colours:
        if not re.match(valid, colour):
            raise ValueError(f"Invalid colour: {colour}")


def _must_have_data(bar: BarChart):
    if len(bar.bins) == 0:
        raise ValueError(
            "A bar chart must have some data to plot but none was provided"
        )


def _consistent_number_of_categories(bar: BarChart):
    """Ensure our bins all contain the same number of data points"""
    for bin in bar.bins:
        if len(bin.data) != bar.num_categories:
            raise ValueError(
                f"Bin '{bin.label}' should have {bar.num_categories} item(s) of data"
                f", but instead it has {len(bin.data)}"
            )

    if bar.category_colours and len(bar.category_colours) != bar.num_categories:
        raise ValueError(
            f"Should have {bar.num_categories} category colours but"
            f" {len(bar.category_colours)} provided"
        )

    if bar.category_labels and len(bar.category_labels) != bar.num_categories:
        raise ValueError(
            f"Should have {bar.num_categories} category labels but"
            f" {len(bar.category_labels)} provided"
        )


def _no_mixed_negative_and_positive_within_category(bar: BarChart):
    """Ensure that all data points in a category are either positive or negative."""
    if not bar.stacked:
        return

    for idx in range(bar.num_categories):
        negative = False

        for bin in bar.bins:
            if bin.data[idx] < 0:
                negative = True
            elif negative is True and bin.data[idx] > 0:
                if bar.category_labels and len(bar.category_labels) > 0:
                    cat_id = f"'{bar.category_labels[idx]}'"
                else:
                    cat_id = f"index {idx}"

                raise ValueError(
                    f"Mixed positive and negative values in category {cat_id}"
                )


def parse_figure(figure: dict) -> BarChart | LineGraph:
    if figure["type"] == "bar":
        bar = typedload.load(figure, BarChart)
        _check_colours_are_valid(bar)
        _must_have_data(bar)
        _consistent_number_of_categories(bar)
        _no_mixed_negative_and_positive_within_category(bar)
        return bar
    elif figure["type"] == "line":
        return typedload.load(figure, LineGraph)
    else:
        raise TypeError(f"Unsupported type: {figure['type']}")
