import React, { useContext } from 'react';
import useExternalState from '../hooks/useExternalState';
import { UpdateFunction } from '../context/UpdateFunction';

export default function LongTextField({
    children,
    notes,
    id,
    value,
    setValue,
    className = '',
}) {
    const updateFn = useContext(UpdateFunction);
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
                        updateFn();
                    }
                }}
                value={current}
            />
            {notes ? <p className="textarea--note text-italic">{notes}</p> : null}
        </div>
    );
}
