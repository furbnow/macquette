import React from 'react';

interface TooltipProps {
    children?: any;
}

export default function Tooltip({ children }: TooltipProps) {
    return <i className="icon-question-sign" title={children}></i>;
}
