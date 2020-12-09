import React from 'react';
import useExternalState from '../hooks/useExternalState';

export default function LongTextField({ children, notes, id, value, setValue, className = "" }) {
    const [current, monitor, setCurrent] = useExternalState(value);

    return (
        <div className={className}>
            <label htmlFor={`field_${id}`}>{children}:</label>
            <textarea
                className="textarea"
                id={`field_${id}`}
                onChange={(evt) => setCurrent(evt.target.value)}
                onBlur={() => {
                    if (current !== monitor) {
                        setValue(current);
                    }
                }}
                value={current}
            />
            {notes ? <p className="textarea--note text-italic">{notes}</p> : null}
        </div>
    );
}
