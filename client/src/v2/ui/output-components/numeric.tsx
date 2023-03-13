import React from 'react';

export type NumberOutputProps = {
    value?: number | undefined | null;
    unit?: string | JSX.Element;
    dp?: number;
};

export function NumberOutput(props: NumberOutputProps) {
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
