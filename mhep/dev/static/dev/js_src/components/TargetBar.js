import React from "react";

/*
 * Draw a 'target bar'.
 *
 * name - string to label the graph with
 * unknown - is this value unknown?
 * value - numeric value
 * units - units for value
 * targets - [ {label: "...", value: x}, {label: "...", value: x} ]
 */
export default function TargetBar({ width, name, unknown, value, units, targets }) {
    const height = 40;

    // Always 25% larger than max target or value
    const targetValues = targets.map((t) => t.value);
    const maxval = Math.max(value, ...targetValues) * 1.25;
    const xscale = width / maxval;

    const header = unknown === true ? "Not enough data" : `${value} ${units}`;

    /* Don't draw targets if we don't have data */
    if (unknown) {
        targets = [];
    }

    const drawLine = (target) => {
        const x = target.value * xscale;

        return (
            <>
                {x === 0 ? null :
                <line
                    key={name + target.label + "_1"}
                    x1={x}
                    y1="1"
                    x2={x}
                    y2={height - 1}
                    className="stroke-beige-200"
                    strokeDasharray="4.33 4.33"
                />}
                <text
                    key={name + target.label + "_2"}
                    x={x + 5}
                    y={height - 22}
                    className="fill-beige-200"
                >
                    {target.value} {units}
                </text>
                <text
                    key={name + target.label + "_3"}
                    x={x + 5}
                    y={height - 8}
                    className="fill-beige-200 text-bold"
                >
                    {target.label}
                </text>
            </>
        );
    };

    return (
        <div className="targetbar">
            <div className="targetbar-head">
                <span>{name}:</span>
                <span>
                    <b>{header}</b>
                </span>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} height={height}>
                <rect
                    x="1"
                    y="1"
                    width={width - 2}
                    height={height - 2}
                    className="fill-beige-800 stroke-beige-200"
                />
                <rect
                    x="2"
                    y="2"
                    width={value * xscale - 4}
                    height={height - 4}
                    className="fill-beige-700"
                />
                {targets.map(drawLine)}
            </svg>
        </div>
    );
}
