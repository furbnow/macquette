import React, { ReactElement } from 'react';

const HEIGHT = 40;

interface Target {
    label: string;
    value: number;
}

interface TargetProps {
    target: Target;
    xscale: number;
    units: string;
}

function Target({ target, xscale, units }: TargetProps) {
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

interface TargetBarProps {
    width: number;
    name: string;
    value: number;
    units: string;
    targets: Target[];
}

/**
 * Draw a 'target bar'.
 *
 * @param name - string to label the graph with
 * @param width - width of bar graph
 * @param value - numeric value
 * @param units - units for value
 * @param targets - [ {label: "...", value: x}, {label: "...", value: x} ]
 */
export default function TargetBar({
    width,
    name,
    value,
    units,
    targets,
}: TargetBarProps): ReactElement {
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
                    {unknown ? 'Not enough data' : `${Math.round(value)} ${units}`}
                </span>
            </div>

            <svg
                viewBox={`0 0 ${width} ${HEIGHT}`}
                height={HEIGHT}
                style={{ maxWidth: '100%' }}
            >
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
