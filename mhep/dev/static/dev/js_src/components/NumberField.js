import React from 'react';
import useExternalState from '../hooks/useExternalState';

function decimalise(s) {
    // Remove everything that isn't allowed in a decimal fraction
    const notAllowed = /([^0-9.])/g;
    return s.replaceAll(notAllowed, '');
}

export default function NumberField({ id, children, units, value, setValue, type="", className="" }) {
    const [current, monitor, setCurrent] = useExternalState(value);

    return (
        <div className="row">
            <label htmlFor={`field_${id}`}>{children}</label>
            <input
                type = {type ? type : ''}
                className = {className ? className : ''}
                id={`field_${id}`}
                onChange={(evt) => setCurrent(decimalise(evt.target.value))}
                onBlur={() => {
                    if (current !== monitor) {
                        setValue(parseFloat(current));
                    }
                }}
                value={current || undefined}
            />
            {' '}{units}
        </div>
    );
}
