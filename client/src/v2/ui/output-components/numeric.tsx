import React from 'react';

export const noOutput: unique symbol = Symbol.for('no output');
export const loading: unique symbol = Symbol.for('loading');

export type NumericOutputProps = {
    value: number | typeof noOutput | typeof loading | null | undefined; // TODO: make this a bit nicer. do we really need all these singleton types?
    unit?: string | JSX.Element;
    dp?: number;
};

export function NumericOutput(props: NumericOutputProps) {
    const { value, unit, dp = 2 } = props;

    if (value === loading) {
        return <>[loading...]</>;
    } else if (value === noOutput) {
        return <>[no output]</>;
    } else if (value === null) {
        return <>[null]</>;
    } else if (value === undefined) {
        return <>[undefined]</>;
    }

    const valString = new Intl.NumberFormat('en', {
        maximumFractionDigits: Number.isInteger(value) ? 0 : dp,
    }).format(value);

    if (unit === undefined) {
        return <>{valString}</>;
    } else {
        return (
            <>
                {valString} {unit}
            </>
        );
    }
}
