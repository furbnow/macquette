import React, { ReactElement } from 'react';

const SCALE = 30;

interface ArrowProps {
    x: number;
    y: number;
    value: number;
    rotate?: number;
    dark?: boolean;
}

const Arrow = ({ x, y, value, rotate = 0, dark = false }: ArrowProps): ReactElement => {
    let v = Math.sqrt(value / SCALE);
    if (isNaN(v)) {
        v = 0;
    }

    return (
        <path
            d="m0 25h65v-25l35 50-35 50v-25h-65z"
            transform={`translate(${x},${y}) rotate(${rotate}) scale(${v}) translate(0,-50)`}
            className={dark ? 'house--darker' : 'house--light'}
        />
    );
};

interface LabelProps {
    x: number;
    y: number;
    label: string;
    value: number;
    anchor?: string;
    dark?: boolean;
}

const Label = ({
    x,
    y,
    label,
    value,
    anchor = 'start',
    dark = false,
}: LabelProps): ReactElement => {
    const textClass = `text-bold ${dark ? 'house--darker' : 'house--dark'}`;
    return (
        <>
            <text x={x} y={y} textAnchor={anchor} className={textClass}>
                {label}
            </text>
            <text x={x} y={y + 35} textAnchor={anchor} className="house--dark">
                {Math.round(value)} W/K
            </text>
        </>
    );
};

export interface HouseProps {
    floor: number;
    ventilation: number;
    infiltration: number;
    windows: number;
    walls: number;
    roof: number;
    thermalbridge: number;
}

export default function House({
    floor,
    ventilation,
    infiltration,
    windows,
    walls,
    roof,
    thermalbridge,
}: HouseProps): ReactElement {
    const total =
        floor + ventilation + infiltration + windows + walls + roof + thermalbridge;

    return (
        <svg className="house" viewBox="0 0 1040 800" preserveAspectRatio="xMinYMin">
            <path
                d="m696 310h20v220h-20zm-420 80h20v60h-20zm220 190h200v-50h20v70h-440v-70h20v50zm-200-290v20h-20v-20h-20v-10l240-170 240 170v10h-20v20h-20v-20l-200-140z"
                className="house--darker"
            />
            <path d="m278 310h16v80h-16zm0 140h16v80h-16z" className="house--med" />
            <Label x={500} y={400} label="Total" value={total} anchor="middle" />

            {/* Top */}

            <Arrow x={340} y={205} value={infiltration} rotate={235} dark={true} />
            <Label x={315} y={50} label="Infiltration" value={infiltration} dark={true} />

            <Arrow x={645} y={200} rotate={-55} value={roof} dark={true} />
            <Label x={530} y={50} label="Roof" value={roof} dark={true} />

            {/* Right */}

            <Arrow x={730} y={350} value={thermalbridge} />
            <Label x={730} y={210} label="Thermal bridging" value={thermalbridge} />

            <Arrow x={730} y={535} value={walls} />
            <Label x={730} y={650} label="Walls" value={walls} />

            {/* Bottom */}

            <Arrow x={460} y={615} rotate={90} value={floor} dark={true} />
            <Label x={540} y={650} label="Floor" value={floor} dark={true} />

            {/* Left */}

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
