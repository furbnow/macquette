import React, { useContext, ReactElement } from 'react';
import { UpdateFunction } from '../context/UpdateFunction';

interface SelectFieldProps<T> {
    id: string;
    options: { value: T; display: string }[];
    value: T | null;
    setValue: (val: T) => void;
}

export default function SelectField<T>({
    id,
    options,
    value,
    setValue,
}: SelectFieldProps<T>): ReactElement {
    const updateFn = useContext(UpdateFunction);
    const current = options.findIndex((row) => row.value === value);

    return (
        <select
            id={`field_${id}`}
            value={current === -1 ? undefined : current}
            onChange={(evt) => {
                const idx = parseInt(evt.target.value, 10);
                setValue(options[idx].value);
                updateFn();
            }}
            onBlur={(evt) => {
                const idx = parseInt(evt.target.value, 10);
                setValue(options[idx].value);
                updateFn();
            }}
        >
            <option hidden>Select one...</option>
            {options.map((opt, i) => (
                <option value={i} key={i}>
                    {opt.display}
                </option>
            ))}
        </select>
    );
}
