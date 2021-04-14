import React, { ReactElement } from 'react';

interface ResultProps {
    val: number | null;
    dp?: number;
    units?: string;
    unitsBefore?: boolean;
}

export default function Result({
    val,
    dp = 2,
    units = '',
    unitsBefore = false,
}: ResultProps): ReactElement {
    if (val === null || isNaN(val)) {
        return <span>- {units}</span>;
    } else {
        return unitsBefore ? (
            <span>
                {units}
                {val.toFixed(dp)}
            </span>
        ) : (
            <span>
                {val.toFixed(dp)} {units}
            </span>
        );
    }
}
