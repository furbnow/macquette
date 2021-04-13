import React from 'react';

interface ICheckboxField {
    id: string;
    value: boolean;
    setValue: any;
}

export default function CheckboxField({ id, value, setValue }: ICheckboxField) {
    return (
        <input
            type="checkbox"
            id={`field_${id}`}
            onChange={(evt) => setValue(evt.target.checked)}
            checked={value ? true : false}
        />
    );
}
