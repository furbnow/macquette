import React from 'react';

export default function CheckboxField({ id, value, setValue }) {
    return (
        <input
            type="checkbox"
            id={`field_${id}`}
            onChange={(evt) => setValue(evt.target.checked)}
            checked={value}
        />
    );
}
