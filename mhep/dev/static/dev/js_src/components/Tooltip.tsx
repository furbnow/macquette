import React, { ReactElement } from 'react';

interface TooltipProps {
    children: string;
}

export default function Tooltip({ children }: TooltipProps): ReactElement {
    return <i className="icon-question-sign" title={children}></i>;
}
