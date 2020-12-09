import React from 'react';

export default function Result({ val, dp = 2 }) {
    if (isNaN(val)) {
        return <span>-</span>;
    } else {
        return <span>{val.toFixed(dp)}</span>;
    }
}
