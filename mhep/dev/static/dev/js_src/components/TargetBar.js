import React from "react";

const HEIGHT = 40;

function Target({ target, xscale, units }) {
    const x = target.value * xscale;

    return (
        <>
            {x === 0 ? null : (
                <line
                    x1={x}
                    y1="1"
                    x2={x}
                    y2={HEIGHT - 1}
                    className="stroke-beige-200"
                    strokeDasharray="4.33 4.33"
                />
            )}
            <text x={x + 5} y={HEIGHT - 22} className="fill-beige-200">
                {target.value} {units}
            </text>
            <text x={x + 5} y={HEIGHT - 8} className="fill-beige-200 text-bold">
                {target.label}
            </text>
        </>
    );
}

/*
 * Draw a 'target bar'.
 *
 * name - string to label the graph with
 * width - width of bar graph
 * value - numeric value
 * units - units for value
 * targets - [ {label: "...", value: x}, {label: "...", value: x} ]
 */
export default function TargetBar({ width, name, value, units, targets }) {
    const unknown = value === null || isNaN(value) || value == Infinity;

    // Always 25% larger than max target or value
    const targetValues = targets.map((t) => t.value);
    const maxval = Math.max(value, ...targetValues) * 1.25;
    const xscale = width / maxval;

    return (
        <div className="targetbar">
            <div className="targetbar-head">
                <span>{name}:</span>
                <span className="text-bold">
                    {unknown ? "Not enough data" : `${Math.round(value)} ${units}`}
                </span>
            </div>

            <svg viewBox={`0 0 ${width} ${HEIGHT}`} height={HEIGHT}>
                <rect
                    x="1"
                    y="1"
                    width={width - 2}
                    height={HEIGHT - 2}
                    className="fill-beige-800 stroke-beige-200"
                />
                <rect
                    x="2"
                    y="2"
                    width={Math.round(value) * xscale - 4}
                    height={HEIGHT - 4}
                    className="fill-beige-700"
                />
                {unknown
                    ? []
                    : targets.map((target) => (
                          <Target
                              key={name + target.label + units}
                              xscale={xscale}
                              target={target}
                              units={units}
                          />
                      ))}
            </svg>
        </div>
    );
}
