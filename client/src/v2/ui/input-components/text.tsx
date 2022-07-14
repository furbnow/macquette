import React, { useState } from 'react';

import { PropsOf } from '../../helpers/props-of';
import { Shadow } from '../../helpers/shadow-object-type';

type BasicTextInputProps = {
    value: string;
    onChange: (value: string) => void;
};

export type TextInputProps = Shadow<PropsOf<'input'>, BasicTextInputProps>;

export function TextInput({
    value: outerValue,
    onChange,
    ...passthroughProps
}: TextInputProps) {
    // Use a nested inner component to make sure internal state gets reset when
    // props are updated
    function Inner() {
        const [internalValue, setInternalValue] = useState<string>(outerValue);
        function handleBlur() {
            if (internalValue !== outerValue) {
                onChange(internalValue);
            }
        }
        return (
            <input
                type="text"
                value={internalValue}
                onChange={(evt) => setInternalValue(evt.target.value)}
                onBlur={handleBlur}
                {...passthroughProps}
            />
        );
    }
    return <Inner />;
}
