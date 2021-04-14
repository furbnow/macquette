import React, { ReactElement, useContext } from 'react';
import useExternalState from '../hooks/useExternalState';
import { UpdateFunction } from '../context/UpdateFunction';

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
    const updateFn = useContext(UpdateFunction);
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
                        updateFn();
                    }
                }}
                value={current}
            />{' '}
            {units}
        </div>
    );
}
