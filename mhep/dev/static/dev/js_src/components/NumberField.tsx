import React, { ReactElement, useContext } from 'react';
import useExternalState from '../hooks/useExternalState';
import { UpdateFunction } from '../context/UpdateFunction';

function decimalise(s: string): string {
    // Remove everything that isn't allowed in a decimal fraction
    const notAllowed = /([^0-9.])/g;
    return s.replaceAll(notAllowed, '');
}

interface NumberFieldProps {
    id: string;
    units?: string;
    value: number | null;
    setValue: (a: number | null) => void;
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
    const [current, monitor, setCurrent] = useExternalState(
        value === null ? '' : value.toString()
    );

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
                        let val: number | null = parseFloat(current);
                        if (isNaN(val)) {
                            val = null;
                        }
                        setValue(val);
                        updateFn();
                    }
                }}
                value={current}
            />{' '}
            {units}
        </div>
    );
}
