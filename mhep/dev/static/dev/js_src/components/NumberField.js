import React from 'react';
import useExternalState from '../hooks/useExternalState';

function decimalise(s) {
    // Remove everything that isn't allowed in a decimal fraction
    const notAllowed = /([^0-9.])/g;
    return s.replaceAll(notAllowed, '');
}

export default function NumberField({ id, units, value, setValue, disabled }) {
    const [current, monitor, setCurrent] = useExternalState(value);

    return (
        <div>
            <input
                disabled={disabled}
                type="text"
                className="input-mini"
                id={`field_${id}`}
                onChange={(evt) => setCurrent(decimalise(evt.target.value))}
                onBlur={() => {
                    if (current !== monitor) {
                        setValue(parseFloat(current));
                    }
                }}
                value={current || undefined}
            />{' '}
            {units}
        </div>
    );
}
