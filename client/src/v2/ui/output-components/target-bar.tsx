import React, { ReactElement, useId } from 'react';

import { zip } from '../../helpers/zip';
import type { Target } from '../../model/datasets/targets';
import { noOutput } from './numeric';

const COLOURS = ['fill-beige-700', 'fill-beige-400'];
const AXIS_COLOUR = 'black';

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
    width: number,
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
            // SAFETY: This index is guaranteed to exist since we're not at the end
            // of the array in this branch.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const next = xPos[idx + 1]!;
            return [pos, next - pos];
        }
    });
}

interface TargetBarProps {
    /** Width of bar graph */
    width: number;
    /** Graph label */
    name: string;
    /** Value or array of values to display */
    value: (number | typeof noOutput)[];
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
export function TargetBar({
    width,
    name,
    value,
    units,
    targets,
}: TargetBarProps): ReactElement {
    const id = useId();

    const values = !Array.isArray(value) ? [value] : value;

    function determineStatus() {
        const filteredValues = values.filter((datapoint): datapoint is number => {
            if (
                datapoint === noOutput ||
                Number.isNaN(datapoint) ||
                datapoint === Infinity
            ) {
                return false;
            } else {
                return true;
            }
        });

        if (values.length !== filteredValues.length) {
            return {
                hasData: false as const,
            };
        } else {
            return {
                hasData: true as const,
                data: filteredValues,
            };
        }
    }
    const status = determineStatus();

    const hasZeroTarget = targets.filter((target) => target.value === 0).length !== 0;
    if (hasZeroTarget) {
        targets = [{ label: '', value: 0 }, ...targets];
    }

    // Always 25% larger than max target or value
    const targetValues = targets.map((t) => t.value);
    const maxval =
        status.hasData === false
            ? Math.max(...targetValues) * 1.25
            : Math.max(...status.data, ...targetValues) * 1.25;
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
                {status.hasData === false && (
                    <span className="text-bold">Not enough data</span>
                )}
            </div>

            <svg
                viewBox={`0 0 ${width} ${totalHeight}`}
                height={totalHeight}
                style={{ maxWidth: '100%' }}
            >
                {values.map((val, idx) =>
                    val === noOutput ? null : (
                        <g key={idx}>
                            <rect
                                x={1}
                                y={1.5 + barHeight * idx}
                                width={Math.round(val) * xscale - 2}
                                height={barHeight}
                                className={COLOURS[idx]}
                            />
                            {status.hasData === true && (
                                <text
                                    x={4 + Math.round(val) * xscale}
                                    y={11.5 + barHeight * idx}
                                    style={{ dominantBaseline: 'middle' }}
                                >
                                    {Math.round(val)} {units}
                                </text>
                            )}
                        </g>
                    ),
                )}

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
                {targetBoxes.map(([xpos, width], idx) => (
                    <rect
                        key={idx}
                        x={xpos}
                        y={barsHeight + axisHeight}
                        width={width}
                        height={targetsHeight - 0.5}
                        stroke={AXIS_COLOUR}
                        fill="transparent"
                    />
                ))}*/}

                {zip(targets, targetBoxes).map(([target, targetBox], idx) => {
                    const x = targetBox[0];
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
