import React from 'react';
import useExternalState from '../hooks/useExternalState';

// 'options' is an array of { value: String, display: String }
function OptionField({ id, children, options, value, setValue }) {
    const [current, monitor, setCurrent] = useExternalState(value);
    return (
        <div>
            <label htmlFor={`field_${id}`}>{children}</label>
            <select
                value={current}
                id={`field_${id}`}
                onChange={(evt) => setCurrent(evt.target.value)}
                onBlur={() => {
                    if (current !== monitor) {
                        setValue(current);
                    }
                }}
            >
                <option hidden>Select one...</option>
                {options.map((opt, i) => (
                    <option value={opt.value} key={i}>
                        {opt.display}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default OptionField;
