import React, { ReactElement } from 'react';

const HEIGHT = 40;
const COLOURS = ['fill-beige-700', 'fill-beige-400'];

interface Target {
    label: string;
    value: number;
}

interface TargetProps {
    target: Target;
    y: number;
    height: number;
    xscale: number;
    units: string;
}

function Target({ target, height, y, xscale, units }: TargetProps) {
    const x = 1.5 + target.value * xscale;

    return (
        <>
            <line x1={x} y1={y} x2={x} y2={y + height / 3} className="stroke-beige-200" />
            <text x={x + 5} y={y + height - 22} className="fill-beige-200">
                {target.value} {units}
            </text>
            <text x={x + 5} y={y + height - 8} className="fill-beige-200 text-bold">
                {target.label}
            </text>
        </>
    );
}

interface TargetBarProps {
    width: number;
    name: string;
    value: number | number[];
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
    const values = !Array.isArray(value) ? [value] : value;
    const unknown =
        values.filter((val) => val === null || isNaN(val) || val == Infinity).length > 0;

    const hasZeroTarget = targets.filter((target) => target.value === 0).length;
    if (!hasZeroTarget) {
        targets = [{ label: '', value: 0 }, ...targets];
    }

    // Always 25% larger than max target or value
    const targetValues = targets.map((t) => t.value);
    const maxval = unknown
        ? Math.max(...targetValues) * 1.25
        : Math.max(...values, ...targetValues) * 1.25;
    const xscale = width / maxval;

    const barHeight = 20;
    const barsHeight = 20 * values.length;
    const axisHeight = 1;
    const targetsHeight = 38;
    const totalHeight = barsHeight + axisHeight + targetsHeight;

    return (
        <div className="targetbar">
            <div className="targetbar-head">
                <span>{name}</span>
                {unknown ? (
                    <span className="text-bold">Not enough data</span>
                ) : (
                    values.length === 1 && (
                        <span className="text-bold">
                            {Math.round(value)} {units}
                        </span>
                    )
                )}
            </div>

            <svg
                viewBox={`0 0 ${width} ${totalHeight}`}
                height={totalHeight}
                style={{ maxWidth: '100%' }}
            >
                {values.map((val, idx) => (
                    <g key={idx}>
                        <rect
                            x={1}
                            y={1.5 + barHeight * idx}
                            width={Math.round(val) * xscale - 2}
                            height={barHeight}
                            className={COLOURS[idx]}
                        />
                        {values.length > 1 && !unknown && (
                            <text
                                x={4 + Math.round(val) * xscale}
                                y={11.5 + barHeight * idx}
                                style={{ dominantBaseline: 'middle' }}
                            >
                                {Math.round(val)} {units}
                            </text>
                        )}
                    </g>
                ))}

                {/* Vertical axis line */}
                <line
                    x1={1.5}
                    y1={1.5}
                    x2={1.5}
                    y2={barsHeight}
                    className="stroke-beige-200"
                />

                {/* Horizontal axis line */}
                <line
                    x1={1}
                    y1={barsHeight + 0.5}
                    x2={width}
                    y2={barsHeight + 1.5}
                    className="stroke-beige-200"
                />

                {targets.map((target, idx) => (
                    <Target
                        key={idx}
                        y={barsHeight + axisHeight}
                        height={targetsHeight}
                        xscale={xscale}
                        target={target}
                        units={units}
                    />
                ))}
            </svg>
        </div>
    );
}
