import React, { ReactElement, useContext } from 'react';
import useExternalState from '../hooks/useExternalState';
import { UpdateFunction } from '../context/UpdateFunction';

function decimalise(s) {
    // Remove everything that isn't allowed in a decimal fraction
    const notAllowed = /([^0-9.])/g;
    return s.replaceAll(notAllowed, '');
}

interface NumberFieldProps {
    id: string;
    units?: string;
    value: number;
    setValue: (a: number) => void;
    disabled?: boolean;
}

export default function NumberField({
    id,
    units = '',
    value,
    setValue,
    disabled = false,
}: NumberFieldProps): ReactElement {
    const updateFn = useContext(UpdateFunction);
    const [current, monitor, setCurrent] = useExternalState(value);

    return (
        <div>
            <input
                disabled={disabled}
                type="text"
                className="input-mini"
                id={`field_${id}`}
                onChange={(evt) => setCurrent(decimalise(evt.target.value))}
                onBlur={() => {
                    if (current !== monitor) {
                        setValue(parseFloat(current));
                        updateFn();
                    }
                }}
                value={current}
            />{' '}
            {units}
        </div>
    );
}
