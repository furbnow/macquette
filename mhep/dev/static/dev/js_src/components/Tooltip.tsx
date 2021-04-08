import React from 'react';

interface ITooltip {
    children?: any
}

export default function Tooltip({children}: ITooltip) {
    return <i className="icon-question-sign" title={children}></i>;
}
