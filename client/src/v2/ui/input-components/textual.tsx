import React, { useState } from 'react';

import { PropsOf } from '../../helpers/props-of';
import { Shadow } from '../../helpers/shadow-object-type';

type BasicTextualInputProps = {
    value: string;
    callback: (value: string) => void;
};

export type TextualInputProps = Shadow<PropsOf<'input'>, BasicTextualInputProps>;

export function TextualInput({
    value: outerValue,
    callback,
    ...passthroughProps
}: TextualInputProps) {
    // Use a nested inner component to make sure internal state gets reset when
    // props are updated
    function Inner() {
        const [modifiedValue, setModifiedValue] = useState<string | null>(null);
        function handleBlur() {
            if (modifiedValue !== null) {
                callback(modifiedValue);
            }
        }
        return (
            <input
                type="text"
                value={modifiedValue ?? outerValue}
                onChange={(evt) => setModifiedValue(evt.target.value)}
                onBlur={handleBlur}
                {...passthroughProps}
            />
        );
    }

    return <Inner />;
}
