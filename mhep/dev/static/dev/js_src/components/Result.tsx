import React from 'react';

interface ResultProps {
    val: number;
    dp?: number;
    units?: string;
    unitsBefore?: boolean;
}

export default function Result({
    val,
    dp = 2,
    units = '',
    unitsBefore = false,
}: ResultProps) {
    if (isNaN(val) || val === null) {
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
