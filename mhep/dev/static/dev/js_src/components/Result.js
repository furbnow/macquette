import React from 'react';

export default function Result({ val, dp = 2, units = '' }) {
    if (isNaN(val) || val === null) {
        return <span>- {units}</span>;
    } else {
        return <span>{val.toFixed(dp)} {units}</span>;
    }
}
