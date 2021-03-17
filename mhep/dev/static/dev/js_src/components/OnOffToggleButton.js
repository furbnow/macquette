import React from 'react';

export default function OnOffToggleButton({ onTitle, offTitle, value, setValue }) {
    return (
        <button
            className="btn"
            onClick={() => setValue(!value)}
            style={{ marginLeft: 10 }}
        >{value ? onTitle : offTitle}
        </button>
    );
}
