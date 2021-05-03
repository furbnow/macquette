import React, { useState, ReactElement } from 'react';

const COLOURS = ['fill-beige-700', 'fill-beige-400'];
const AXIS_COLOUR = 'black';

interface Target {
    label: string;
    value: number;
}

/**
 * Calculate x pos + width of target bounding boxes
 *
 * Equivalent to the following:
 *
 * if (targets.length === 2) {
 *     return [
 *         [ xPos[0], xPos[1] - xPos[0] ],
 *         [ xPos[1], width - xPos[2] - 0.5 ],
 *     ];
 * } else if (targets.length === 3) {
 *     return [
 *         [ xPos[0], xPos[1] - xPos[0] ],
 *         [ xPos[1], xPos[2] - xPos[1] ],
 *         [ xPos[2], width - xPos[2] - 0.5 ],
 *     ];
 * } else {
 *     return [];
 * }
 */
function calculateTargetBoxes(
    targets: Target[],
    xscale: number,
    width: number
): [number, number][] {
    /* Special case length === 1 for clarity */
    if (targets.length === 1) {
        return [[1, width - 1]];
    }

    const xPos = targets.map((target) => 1 + target.value * xscale);

    return xPos.map((pos, idx) => {
        if (idx === targets.length - 1) {
            return [pos, width - pos - 0.5];
        } else {
            return [pos, xPos[idx + 1] - pos];
        }
    });
}

interface TargetBarProps {
    /** Width of bar graph */
    width: number;
    /** Graph label */
    name: string;
    /** Value or array of values to display */
    value: number | number[];
    /** Units for values */
    units: string;
    /** Array of label, value pairs for targets */
    targets: Target[];
}

/**
 * Draw a horizontal mini bar graph with specified axis markers ('targets').
 *
 * Calculate the bounding box for the text of each target and use it as a clipping path
 * so that the text doesn't mush up and look really ugly.  Still doesn't look great but
 * it's an improvement over what came before.
 */
export default function TargetBar({
    width,
    name,
    value,
    units,
    targets,
}: TargetBarProps): ReactElement {
    const [id] = useState(Math.floor(Math.random() * 255));

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

    const targetBoxes = calculateTargetBoxes(targets, xscale, width);

    return (
        <div className="targetbar">
            <div className="targetbar-head">
                <span>{name}</span>
                {unknown && <span className="text-bold">Not enough data</span>}
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
                        {!unknown && (
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
                    y2={barsHeight + 0.5}
                    stroke={AXIS_COLOUR}
                />

                {/* Horizontal axis line */}
                <line
                    x1={1}
                    y1={barsHeight + 1}
                    x2={width}
                    y2={barsHeight + 1}
                    stroke={AXIS_COLOUR}
                />

                {targetBoxes.map(([xpos, width], idx) => (
                    <clipPath key={idx} id={`clip-target-${id}-${idx}`}>
                        <rect
                            x={xpos}
                            y={barsHeight + axisHeight}
                            width={width - 1}
                            height={targetsHeight - 0.5}
                        />
                    </clipPath>
                ))}

                {/* Useful for debugging so leaving in here.

                targetBoxes.map(([xpos, width], idx) => (
                    <rect
                        idx={idx}
                        x={xpos}
                        y={barsHeight + axisHeight}
                        width={width}
                        height={targetsHeight - 0.5}
                        stroke={AXIS_COLOUR}
                        fill="transparent"
                    />
                ))*/}

                {targets.map((target, idx) => {
                    const x = targetBoxes[idx][0];
                    const y = barsHeight + axisHeight;
                    const height = targetsHeight;

                    return (
                        <g key={idx} clipPath={`url(#clip-target-${id}-${idx})`}>
                            <line
                                x1={x + 0.5}
                                y1={y}
                                x2={x + 0.5}
                                y2={y + height / 3}
                                stroke={AXIS_COLOUR}
                            />
                            <text
                                x={x + 5}
                                y={y + height - 22}
                                className="fill-beige-200"
                            >
                                {target.value} {units}
                            </text>
                            <text
                                x={x + 5}
                                y={y + height - 8}
                                className="fill-beige-200 text-bold"
                            >
                                {target.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
