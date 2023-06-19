import React from 'react';

import { PropsOf } from '../../helpers/props-of';
import { Shadow } from '../../helpers/shadow-object-type';

type BasicCheckboxProps = {
    value: boolean;
    onChange: (checked: boolean) => void;
};

export type CheckboxProps = Shadow<PropsOf<'input'>, BasicCheckboxProps>;

export function CheckboxInput({ value, onChange, ...passthrough }: CheckboxProps) {
    return (
        <input
            type="checkbox"
            checked={value}
            onChange={(evt) => {
                if (passthrough.readOnly === true || passthrough.disabled === true) {
                    return;
                } else {
                    onChange(evt.target.checked);
                }
            }}
            {...passthrough}
        />
    );
}
