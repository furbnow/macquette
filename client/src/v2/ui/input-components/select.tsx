import React from 'react';

import { PropsOf } from '../../helpers/props-of';
import { Shadow } from '../../helpers/shadow-object-type';

type BasicSelectProps<T> = {
    options: {
        value: T;
        display: string;
    }[];
    selected: T | null;
    callback: (value: T) => void;
};

export type SelectProps<T> = Shadow<PropsOf<'select'>, BasicSelectProps<T>>;

const UNSELECTED_VALUE = '__unselected__';

export const Select = <T extends string>({
    options,
    callback,
    selected,
    ...passthrough
}: SelectProps<T>) => {
    const castTargetValue = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return evt.target.value as T;
    };
    let unselected;
    if (selected === null) {
        unselected = (
            <option key={null} value={UNSELECTED_VALUE} disabled>
                Select...
            </option>
        );
    } else {
        unselected = <></>;
    }
    return (
        <select
            onChange={(evt) => callback(castTargetValue(evt))}
            value={selected ?? UNSELECTED_VALUE}
            {...passthrough}
        >
            {unselected}
            {options.map(({ value, display }) => (
                <option key={value} value={value}>
                    {display}
                </option>
            ))}
        </select>
    );
};
