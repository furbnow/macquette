import React from 'react';

import { PropsOf } from '../../helpers/props-of';
import { Shadow } from '../../helpers/shadow-object-type';

type BasicCheckboxProps = {
    checked: boolean;
    callback: (checked: boolean) => void;
};

export type CheckboxProps = Shadow<PropsOf<'input'>, BasicCheckboxProps>;

export function CheckboxInput({ checked, callback, ...passthrough }: CheckboxProps) {
    return (
        <input
            type="checkbox"
            checked={checked}
            onChange={(evt) => {
                if (passthrough.readOnly === true || passthrough.disabled === true) {
                    return;
                } else {
                    callback(evt.target.checked);
                }
            }}
            {...passthrough}
        />
    );
}
