import React, { useContext, ReactElement } from 'react';
import { AppContext } from '../context/AppContext';

interface CheckboxFieldProps {
    id: string;
    value: boolean;
    setValue: (val: boolean) => void;
}

export default function CheckboxField({
    id,
    value,
    setValue,
}: CheckboxFieldProps): ReactElement {
    const { update } = useContext(AppContext);

    return (
        <input
            type="checkbox"
            id={`field_${id}`}
            onChange={(evt) => {
                setValue(evt.target.checked);
                update();
            }}
            checked={value}
        />
    );
}
