import React from 'react';

import { InfoIcon } from '../icons';

const SCALE = 30;

interface ArrowProps {
    x: number;
    y: number;
    value: number | null;
    rotate?: number;
    colour?: 'light' | 'dark';
}

function Arrow({ x, y, value, rotate = 0, colour = 'light' }: ArrowProps) {
    if (value === null) {
        return null;
    }

    let v = Math.sqrt(value / SCALE);
    if (isNaN(v)) {
        v = 0;
    }

    return (
        <path
            d="m0 25h65v-25l35 50-35 50v-25h-65z"
            transform={`translate(${x},${y}) rotate(${rotate}) scale(${v}) translate(0,-50)`}
            className={`house--${colour}`}
        />
    );
}

type LabelProps = {
    x: number;
    y: number;
    label: string;
    value: number | null;
    anchor?: string;
    colour?: 'light' | 'dark' | 'neutral';
};

function Label({ x, y, label, value, anchor = 'start', colour = 'light' }: LabelProps) {
    const textClass = `house--${colour}-text`;
    return (
        <>
            <text x={x} y={y} textAnchor={anchor} className={'text-bold ' + textClass}>
                {label}
            </text>
            <text x={x} y={y + 35} textAnchor={anchor} className={textClass}>
                {value === null ? '?' : Math.round(value)} W/K
            </text>
        </>
    );
}

interface RoundingErrorTooltipProps extends HouseProps {
    total: number;
}

function RoundingErrorTooltip({
    floor,
    ventilation,
    infiltration,
    windows,
    walls,
    roof,
    thermalbridge,
    total,
}: RoundingErrorTooltipProps) {
    const allValues = [
        floor,
        ventilation,
        infiltration,
        windows,
        walls,
        roof,
        thermalbridge,
    ];
    const cumulativeRoundedTotal = allValues
        .filter((row): row is number => row !== null)
        .reduce((prev, curr) => prev + Math.round(curr), 0);
    const isRoundingError = cumulativeRoundedTotal !== Math.round(total);

    if (!isRoundingError) {
        return null;
    } else {
        return (
            <svg x={550} y={365}>
                <InfoIcon
                    width={16 * 2.5}
                    height={16 * 2.5}
                    style={{ color: 'rgba(99, 86, 71, 0.6)' }}
                />
                <title>Total not equal to sum of output arrows due to rounding</title>
            </svg>
        );
    }
}

type HouseProps = {
    floor: number | null;
    ventilation: number | null;
    infiltration: number | null;
    windows: number | null;
    walls: number | null;
    roof: number | null;
    thermalbridge: number | null;
};

export function House({
    floor,
    ventilation,
    infiltration,
    windows,
    walls,
    roof,
    thermalbridge,
}: HouseProps) {
    const allValues = [
        floor,
        ventilation,
        infiltration,
        windows,
        walls,
        roof,
        thermalbridge,
    ];
    const total = allValues
        .filter((row): row is number => row !== null)
        .reduce((prev, curr) => prev + curr, 0);

    return (
        <svg className="house" viewBox="0 0 1040 800" preserveAspectRatio="xMinYMin">
            <path
                d="m696 310h20v220h-20zm-420 80h20v60h-20zm220 190h200v-50h20v70h-440v-70h20v50zm-200-290v20h-20v-20h-20v-10l240-170 240 170v10h-20v20h-20v-20l-200-140z"
                style={{ fill: 'var(--grey-300)' }}
            />
            <path
                d="m278 310h16v80h-16zm0 140h16v80h-16z"
                style={{ fill: 'var(--grey-600)' }}
            />
            <Label
                x={500}
                y={400}
                label="TOTAL"
                value={total}
                anchor="middle"
                colour="neutral"
            />
            <RoundingErrorTooltip
                floor={floor}
                ventilation={ventilation}
                infiltration={infiltration}
                windows={windows}
                walls={walls}
                roof={roof}
                thermalbridge={thermalbridge}
                total={total}
            />

            <Arrow x={340} y={205} value={infiltration} rotate={235} colour="dark" />
            <Label
                x={315}
                y={50}
                label="Infiltration"
                value={infiltration}
                colour="dark"
            />

            <Arrow x={645} y={200} rotate={-55} value={roof} />
            <Label x={530} y={50} label="Roof" value={roof} />

            <Arrow x={730} y={350} value={thermalbridge} colour="dark" />
            <Label
                x={730}
                y={210}
                label="Thermal bridging"
                value={thermalbridge}
                colour="dark"
            />

            <Arrow x={730} y={535} value={walls} />
            <Label x={730} y={650} label="Walls" value={walls} />

            <Arrow x={460} y={615} rotate={90} value={floor} colour="dark" />
            <Label x={540} y={650} label="Floor" value={floor} colour="dark" />

            <Arrow x={260} y={215 + 135} rotate={180} value={windows} />
            <Label x={260} y={215} label="Windows" value={windows} anchor="end" />

            <Arrow x={260} y={535} rotate={180} value={ventilation} />
            <Label
                x={260}
                y={535 + 115}
                label="Ventilation"
                value={ventilation}
                anchor="end"
            />
        </svg>
    );
}
