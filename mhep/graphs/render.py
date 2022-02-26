from base64 import b64encode
from io import BytesIO
from typing import Union

import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np

from mhep.graphs import types

mpl.use("agg")

bar_colours = [
    "#4286f4",
    "#f6a607",
    "#9dd5cb",
    "#18563e",
    "#f0d49c",
    "#ec674f",
    "#83332f",
    "#c8d5cb",
]
bg_colours = ["#444", "#aaa"]


def _render_bar_chart(figure: types.BarChart):
    fig, ax = plt.subplots()

    ax.set_xlabel(figure.units)

    # Shaded areas can have labels or not; if they do we need more space at the
    # bottom of the graph.
    extra_label_space = False

    # Shaded areas get added now so they are plotted underneath the bars.
    if figure.areas:
        for idx, area in enumerate(figure.areas):
            lower, upper = area.interval
            ax.axvspan(
                lower,
                upper,
                facecolor=bg_colours[idx % len(bg_colours)],
                alpha=0.15,
                edgecolor="#000",
            )
            if area.label:
                ax.text(lower + (upper - lower) / 2, -0.75, area.label, ha="center")
                extra_label_space = True

    # Convert our data from being per-bin into being per-category.
    dataset = []
    for idx in range(figure.num_categories):
        category = [bin.data[idx] for bin in figure.bins]
        category.reverse()
        dataset.append(category)

    bin_labels = [bin.label for bin in figure.bins]
    bin_labels.reverse()
    x = np.arange(len(bin_labels))  # the label locations

    if figure.stacked:
        width = 0.75

        # With stacked charts we have to keep a running total of the 'left' position.
        # This is so we can actually stack the bars instead of drawing them on top of
        # each other.  We keep negative and positive starts separately do we can do
        # bars both below and above 0 on the same figure.
        pos_cum_size = np.zeros(len(figure.bins))
        neg_cum_size = np.zeros(len(figure.bins))

        for idx, data in enumerate(dataset):
            negative = any(val < 0 for val in data)

            rects = ax.barh(
                x,
                data,
                width,
                left=neg_cum_size if negative else pos_cum_size,
                linewidth=0.5,
                edgecolor="#000",
                tick_label=bin_labels,
                color=bar_colours[idx % len(bar_colours)],
            )

            if negative:
                neg_cum_size += data
            else:
                pos_cum_size += data

        # Vertical line at 0 if we have pos + neg on same chart
        if sum(neg_cum_size) != 0:
            ax.axvline(color="#000", linewidth=0.5)

    else:
        width = 0.75 / figure.num_categories

        for idx, data in enumerate(dataset):
            rects = ax.barh(
                x + (idx * width),
                data,
                width,
                linewidth=0.5,
                edgecolor="#000",
                tick_label=bin_labels,
                color=bar_colours[idx % len(bar_colours)],
            )

            units = figure.units if len(figure.units) < 5 else ""
            texts = ax.bar_label(
                rects, labels=[f"{r:.1f}{units}" for r in data], padding=-5
            )
            for t in texts:
                t.set(color="white", ha="right")

    # We do this here rather than above because plotting the bars changes the ybound.
    if figure.areas and extra_label_space:
        ax.set_ybound(ax.get_ybound()[0] - 0.45, None)

    # Make the x limit just a little bit wider so that the edges of our bar borders
    # don't get chopped off.
    xticks = ax.get_xticks()
    plt.xlim(xticks[0], xticks[-1] + 1)

    # Add thousand separators
    ax.get_xaxis().set_major_formatter(
        mpl.ticker.FuncFormatter(lambda x, p: format(int(x), ","))
    )

    plt.tick_params(left=False)
    ax.spines["right"].set_visible(False)
    ax.spines["top"].set_visible(False)

    fig.tight_layout()

    if figure.num_categories > 1:
        key = [
            (name, bar_colours[idx % len(bar_colours)])
            for idx, name in enumerate(figure.category_labels)
        ]
    else:
        key = None

    return fig, key


def _render_line_graph(figure: types.LineGraph):
    """Render a simple line graph."""

    fig, ax = plt.subplots()

    ax.set_xlabel(figure.x_axis.units)
    ax.set_ylabel(figure.y_axis.units)

    # Add thousand separators
    ax.get_yaxis().set_major_formatter(
        mpl.ticker.FuncFormatter(lambda x, p: format(int(x), ","))
    )

    for idx, row in enumerate(figure.rows):
        x = [data[0] for data in row.data]
        y = [data[1] for data in row.data]

        ax.plot(x, y, label=row.label, color=bar_colours[idx % len(bar_colours)])
        ax.text(x[-1], y[-1], f" {row.label}")

    ax.spines["right"].set_visible(False)
    ax.spines["top"].set_visible(False)

    fig.tight_layout()

    return fig, None


def render(data: Union[types.BarChart, types.LineGraph]):
    # Make it squat
    plt.rc("figure", figsize=(6, 3.5))

    if isinstance(data, types.BarChart):
        return _render_bar_chart(data)
    elif isinstance(data, types.LineGraph):
        return _render_line_graph(data)


def to_url(fig) -> str:
    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=300)
    encoded = b64encode(buf.getbuffer()).decode("ascii")
    return f"data:image/png;base64,{encoded}"
