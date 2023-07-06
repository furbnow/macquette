import re
from typing import Literal

from pydantic import BaseModel, root_validator, validator


def to_camel(underscored: str) -> str:
    parts = underscored.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class Bin(BaseModel):
    label: str
    data: list[float]

    class Config:
        extra = "forbid"


class Line(BaseModel):
    value: float
    label: str

    class Config:
        extra = "forbid"


class ShadedArea(BaseModel):
    interval: tuple[float, float]
    label: str | None = None

    class Config:
        extra = "forbid"


class BarChart(BaseModel):
    type: Literal["bar"]
    stacked: bool | None = False
    units: str
    bins: list[Bin]
    num_categories: int
    category_labels: list[str] | None
    category_colours: list[str] | None
    lines: list[Line] | None
    areas: list[ShadedArea] | None

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

    @validator("category_colours")
    def _check_colours_are_valid(cls, v: list[str]) -> list[str]:
        valid = r"^#[a-f0-9]{6}$"
        for colour in v:
            if not re.match(valid, colour):
                raise ValueError(f"Invalid colour: {colour}")
        return v

    @validator("bins")
    def _must_have_data(cls, v: list[Bin]) -> list[Bin]:
        if len(v) == 0:
            raise ValueError(
                "A bar chart must have some data to plot but none was provided"
            )
        return v

    @root_validator(skip_on_failure=True)
    def _validate(cls, values):
        cls._consistent_number_of_categories(cls, values)
        cls._no_mixed_negative_and_positive_within_category(cls, values)
        return values

    @staticmethod
    def _consistent_number_of_categories(cls, values):
        bins = values.get("bins")
        num_categories = values.get("num_categories")

        # Ensure our bins all contain the same number of data points
        for bin in bins:
            if len(bin.data) != num_categories:
                raise ValueError(
                    f"Bin '{bin.label}' should have {num_categories} item(s) of data"
                    f", but instead it has {len(bin.data)}"
                )

        category_colours = values.get("category_colours")
        if category_colours and len(category_colours) != num_categories:
            raise ValueError(
                f"Should have {num_categories} category colours but"
                f" {len(category_colours)} provided"
            )

        category_labels = values.get("category_labels")
        if category_labels and len(category_labels) != num_categories:
            raise ValueError(
                f"Should have {num_categories} category labels but"
                f" {len(category_labels)} provided"
            )

    @staticmethod
    def _no_mixed_negative_and_positive_within_category(cls, values):
        """Ensure that all data points in a category are either positive or negative."""
        stacked = values.get("stacked")
        bins = values.get("bins")
        category_labels = values.get("category_labels")
        num_categories = values.get("num_categories")

        if not stacked:
            return

        for idx in range(num_categories):
            negative = False

            for bin in bins:
                if bin.data[idx] < 0:
                    negative = True
                elif negative is True and bin.data[idx] > 0:
                    if category_labels and len(category_labels) > 0:
                        cat_id = f"'{category_labels[idx]}'"
                    else:
                        cat_id = f"index {idx}"

                    raise ValueError(
                        f"Mixed positive and negative values in category {cat_id}"
                    )

    class Config:
        alias_generator = to_camel
        extra = "forbid"


class Axis(BaseModel):
    units: str

    class Config:
        extra = "forbid"


class LineRow(BaseModel):
    label: str
    data: list[list[float]]

    class Config:
        extra = "forbid"


class LineGraph(BaseModel):
    type: Literal["line"]
    x_axis: Axis
    y_axis: Axis
    rows: list[LineRow]

    class Config:
        alias_generator = to_camel
        extra = "forbid"


def parse_figure(figure: dict) -> BarChart | LineGraph:
    if figure["type"] == "bar":
        return BarChart(**figure)
    elif figure["type"] == "line":
        return LineGraph(**figure)
    else:
        raise TypeError(f"Unsupported type: {figure['type']}")
