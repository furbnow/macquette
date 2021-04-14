import React, { useContext } from 'react';
import { UpdateFunction } from '../context/UpdateFunction';

export default function OnOffToggleButton({ onTitle, offTitle, value, setValue }) {
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
