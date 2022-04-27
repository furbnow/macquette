import React, { ReactElement, useContext } from 'react';

import { AppContext } from '../context/AppContext';
import useExternalState from '../hooks/useExternalState';

interface TextFieldProps {
    id: string;
    units?: string;
    value: string;
    setValue: (a: string) => void;
    className?: string;
    updateModel?: boolean;
}

export default function TextField({
    id,
    units = '',
    value,
    setValue,
    className = '',
    updateModel = true,
}: TextFieldProps): ReactElement {
    const { update } = useContext(AppContext);
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
                        if (updateModel) {
                            update();
                        }
                    }
                }}
                value={current}
            />{' '}
            {units}
        </div>
    );
}
