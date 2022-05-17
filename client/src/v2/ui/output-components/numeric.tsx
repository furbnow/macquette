import React from 'react';

export const noOutput: unique symbol = Symbol.for('no output');
export const loading: unique symbol = Symbol.for('loading');

export type NumericOutputProps = {
    value: number | typeof noOutput | typeof loading;
    unit?: string | JSX.Element;
    dp?: number;
};

export function NumericOutput(props: NumericOutputProps) {
    const { value, unit, dp = 2 } = props;

    if (value === loading) {
        return <>[loading...]</>;
    } else if (value === noOutput) {
        return <>[no output]</>;
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
