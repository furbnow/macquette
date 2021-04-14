import React, { useContext, ReactElement } from 'react';
import { UpdateFunction } from '../context/UpdateFunction';

interface SelectFieldProps<T> {
    id: string;
    options: { value: T; display: string }[];
    value: T;
    setValue: (val: T) => void;
}

export default function SelectField<Type>({
    id,
    options,
    value,
    setValue,
}: SelectFieldProps<Type>): ReactElement {
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
