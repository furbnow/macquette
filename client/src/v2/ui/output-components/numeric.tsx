import React from 'react';

export type NumericOutputProps = {
    value?: number | undefined | null;
    unit?: string | JSX.Element;
    dp?: number;
};

export function NumericOutput(props: NumericOutputProps) {
    const { value, unit, dp = 2 } = props;

    const valString =
        value === undefined || value === null
            ? '-'
            : new Intl.NumberFormat('en', {
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
