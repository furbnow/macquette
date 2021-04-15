import React, { useContext, ReactElement } from 'react';
import { UpdateFunction } from '../context/UpdateFunction';

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
    const updateFn = useContext(UpdateFunction);

    return (
        <input
            type="checkbox"
            id={`field_${id}`}
            onChange={(evt) => {
                setValue(evt.target.checked);
                updateFn();
            }}
            checked={value}
        />
    );
}
