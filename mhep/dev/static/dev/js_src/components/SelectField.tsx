import React, { useContext } from 'react';
import { UpdateFunction } from '../context/UpdateFunction';

interface ISelectField {
    id: string;
    options: any;
    value: string | number | any;
    setValue: any;
}

// 'options' is an array of { value: String, display: String }
function SelectField({ id, options, value, setValue }: ISelectField) {
    const updateFn = useContext(UpdateFunction);
    return (
        <select
            value={value}
            id={`field_${id}`}
            onChange={(evt) => {
                setValue(evt.target.value);
                updateFn();
            }}
            onBlur={(evt) => {
                setValue(evt.target.value);
                updateFn();
            }}
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
