import React, { ReactElement } from 'react';
import { Info } from './icons/info';

interface TooltipProps {
    children: string;
}

export default function Tooltip({ children }: TooltipProps): ReactElement {
    return (
        <span title={children}>
            <Info
                style={{
                    color: '#5e5e5e',
                    marginLeft: '6px',
                    verticalAlign: 'text-bottom',
                }}
            />
        </span>
    );
}
