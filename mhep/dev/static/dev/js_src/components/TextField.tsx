import React, { ReactElement } from 'react';
import useExternalState from '../hooks/useExternalState';

interface TextFieldProps {
    id: string;
    units?: string;
    value: string;
    setValue: (a: string) => void;
    className?: string;
}

export default function TextField({
    id,
    units = '',
    value,
    setValue,
    className = '',
}: TextFieldProps): ReactElement {
    const [current, monitor, setCurrent] = useExternalState(value);

    return (
        <div>
            <input
                type="text"
                className={className}
                id={`field_${id}`}
                onChange={(evt) => setCurrent(evt.target.value)}
                onBlur={() => {
                    if (current !== monitor) {
                        setValue(current);
                    }
                }}
                value={current}
            />{' '}
            {units}
        </div>
    );
}
