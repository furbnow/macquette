import React, { ReactElement, useContext } from 'react';
import { UpdateFunction } from '../context/UpdateFunction';

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
    const updateFn = useContext(UpdateFunction);
    return (
        <button
            className="btn"
            onClick={() => {
                setValue(!value);
                updateFn();
            }}
            style={{ marginLeft: 10 }}
        >
            {value ? onTitle : offTitle}
        </button>
    );
}
