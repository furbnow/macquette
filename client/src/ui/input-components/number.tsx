import React from 'react';

import { PropsOf } from '../../helpers/props-of';
import { Shadow } from '../../helpers/shadow-object-type';
import { useStateTracker } from './use-state-tracker';

type BasicNumberInputProps = {
    value: number | null;
    onChange: (value: number | null) => void;
    unit?: string;
};

export type NumberInputProps = Shadow<PropsOf<'input'>, BasicNumberInputProps>;

export function NumberInput({
    value,
    onChange,
    style: styleProp,
    unit,
    ...passthroughProps
}: NumberInputProps) {
    const [innerState, setInnerState] = useStateTracker<string>(
        value?.toString(10) ?? '',
    );

    const parseable =
        innerState !== null && /^-?([1-9]\d*|0)(\.\d*[1-9])?$/.test(innerState);
    const valid = innerState === null || innerState === '' || parseable;
    function handleBlur() {
        if (innerState !== value?.toString(10)) {
            if (innerState === '') {
                onChange(null);
            } else if (parseable) {
                onChange(parseFloat(innerState));
            }
        }
    }
    const style: React.CSSProperties = {
        ...(styleProp ?? {}),
        ...(valid ? {} : { borderColor: 'red' }),
    };
    let unitFragment: JSX.Element | null = null;
    if (unit !== undefined) {
        unitFragment = <>&nbsp;{unit}</>;
    }
    const { className, ...rest } = passthroughProps;
    return (
        <span style={{ whiteSpace: 'nowrap' }} className={className}>
            <input
                type="text"
                className="input--number"
                value={innerState}
                onChange={(evt) => setInnerState(evt.target.value)}
                onBlur={handleBlur}
                style={style}
                {...rest}
            />
            {unitFragment}
        </span>
    );
}
