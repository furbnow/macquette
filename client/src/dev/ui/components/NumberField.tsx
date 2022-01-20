import React, { ReactElement, useContext } from 'react';
import useExternalState from '../hooks/useExternalState';
import { AppContext } from '../context/AppContext';

function decimalise(s: string): string {
    // Remove everything that isn't allowed in a decimal fraction
    const notAllowed = /([^0-9.])/g;
    return s.replace(notAllowed, '');
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
    const { update } = useContext(AppContext);
    const [current, monitor, setCurrent] = useExternalState(
        value === null ? '' : value.toString(),
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
                        update();
                    }
                }}
                value={current}
            />{' '}
            {units}
        </div>
    );
}
