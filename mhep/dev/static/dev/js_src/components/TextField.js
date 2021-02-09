import React from 'react';
import useExternalState from '../hooks/useExternalState';

export default function TextField({ id, units, value, setValue, className = '' }) {
    const [current, monitor, setCurrent] = useExternalState(value);

    return (
        <div>
            <input
                type="text"
                className={className}
                id={`field_${id}`}
                onChange={(evt) => setCurrent(evt.target.value)}
                onBlur={() => {
                    if (current !== monitor) {
                        setValue(current);
                    }
                }}
                value={current}
            />{' '}
            {units}
        </div>
    );
}
