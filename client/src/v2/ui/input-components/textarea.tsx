import React, { useState } from 'react';

import { PropsOf } from '../../helpers/props-of';
import { Shadow } from '../../helpers/shadow-object-type';

type BasicTextareaProps = {
    value: string;
    onChange: (value: string) => void;
};

export type TextareaProps = Shadow<PropsOf<'textarea'>, BasicTextareaProps>;

export function Textarea({
    value: outerValue,
    onChange,
    ...passthroughProps
}: TextareaProps) {
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
            <textarea
                value={internalValue}
                onChange={(evt) => setInternalValue(evt.target.value)}
                onBlur={handleBlur}
                {...passthroughProps}
            />
        );
    }
    return <Inner />;
}
