import React, { ReactElement, useContext } from 'react';

import { AppContext } from '../context/AppContext';

interface OnOffToggleButtonProps {
    onTitle: string;
    offTitle: string;
    value: boolean;
    setValue: (val: boolean) => void;
}

export default function OnOffToggleButton({
    onTitle,
    offTitle,
    value,
    setValue,
}: OnOffToggleButtonProps): ReactElement {
    const { update } = useContext(AppContext);
    return (
        <button
            className="btn"
            onClick={() => {
                setValue(!value);
                update();
            }}
            style={{ marginLeft: 10 }}
        >
            {value ? onTitle : offTitle}
        </button>
    );
}
