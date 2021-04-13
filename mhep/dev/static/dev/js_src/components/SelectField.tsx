import React from 'react';

interface ISelectField {
    id: string;
    options: any;
    value: string | number | any;
    setValue: any;
}

// 'options' is an array of { value: String, display: String }
function SelectField({ id, options, value, setValue }: ISelectField) {
    return (
        <select
            value={value}
            id={`field_${id}`}
            onChange={(evt) => setValue(evt.target.value)}
            onBlur={(evt) => setValue(evt.target.value)}
        >
            <option hidden>Select one...</option>
            {options.map((opt, i) => (
                <option value={opt.value} key={i}>
                    {opt.display}
                </option>
            ))}
        </select>
    );
}

export default SelectField;
