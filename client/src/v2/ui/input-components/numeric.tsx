import React, { useState } from 'react';
import { PropsOf } from '../../helpers/props-of';
import { Shadow } from '../../helpers/shadow-object-type';

type BasicNumericInputProps = {
    value: number | null;
    callback: (value: number | null) => void;
};

export type NumericInputProps = Shadow<PropsOf<'input'>, BasicNumericInputProps>;

export const NumericInput = ({
    value: outerValue,
    callback,
    style: styleProp,
    ...passthroughProps
}: NumericInputProps) => {
    // Use a nested inner component to make sure internal state gets reset when
    // props are updated
    const Inner = () => {
        const [modifiedValue, setModifiedValue] = useState<string | null>(null);
        const parseable =
            modifiedValue !== null && /^-?([1-9]\d*|0)(\.\d*[1-9])?$/.test(modifiedValue);
        const valid = modifiedValue === null || modifiedValue === '' || parseable;
        const handleBlur = () => {
            if (modifiedValue !== null) {
                if (modifiedValue === '') {
                    callback(null);
                } else if (parseable) {
                    callback(parseFloat(modifiedValue));
                }
            }
        };
        const style: React.CSSProperties = {
            ...(styleProp ?? {}),
            ...(valid ? {} : { borderColor: 'red' }),
        };
        return (
            <input
                type="text"
                value={modifiedValue ?? outerValue?.toString(10) ?? ''}
                onChange={(evt) => setModifiedValue(evt.target.value)}
                onBlur={handleBlur}
                style={style}
                {...passthroughProps}
            />
        );
    };
    return <Inner />;
};
