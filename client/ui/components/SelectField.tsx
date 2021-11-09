import React, { useContext, ReactElement } from 'react';
import { AppContext } from '../context/AppContext';

interface SelectFieldProps<T> {
    id: string;
    options: { value: T; display: string }[];
    value: T | null;
    setValue: (val: T) => void;
    updateModel?: boolean;

    /** Should only be used for the first input on a dialog */
    autoFocus?: boolean;
}

export default function SelectField<T>({
    id,
    options,
    value,
    setValue,
    updateModel = true,
    autoFocus = false,
}: SelectFieldProps<T>): ReactElement {
    const { update } = useContext(AppContext);
    const current = options.findIndex((row) => row.value === value);

    function handleUpdate(value: string) {
        const idx = parseInt(value, 10);
        setValue(options[idx]!.value);
        updateModel && update();
    }

    return (
        <select
            id={`field_${id}`}
            value={current === -1 ? undefined : current}
            onChange={(evt) => handleUpdate(evt.target.value)}
            onBlur={(evt) => handleUpdate(evt.target.value)}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus={autoFocus}
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
