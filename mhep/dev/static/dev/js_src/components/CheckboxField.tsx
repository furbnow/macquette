import React, { useContext, ReactElement } from 'react';
import { UpdateFunction } from '../context/UpdateFunction';

interface ICheckboxField {
    id: string;
    value: boolean;
    setValue: (boolean) => void;
}

export default function CheckboxField({
    id,
    value,
    setValue,
}: ICheckboxField): ReactElement {
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
