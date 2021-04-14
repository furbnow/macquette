import React, { useContext, ReactElement } from 'react';
import useExternalState from '../hooks/useExternalState';
import { UpdateFunction } from '../context/UpdateFunction';

interface LongTextFieldProps {
    id: string;
    notes?: string;
    value: string;
    setValue: (a: string) => void;
}

export default function LongTextField({
    id,
    notes,
    value,
    setValue,
}: LongTextFieldProps): ReactElement {
    const updateFn = useContext(UpdateFunction);
    const [current, monitor, setCurrent] = useExternalState(value);

    return (
        <>
            <textarea
                className="textarea"
                id={`field_${id}`}
                onChange={(evt) => setCurrent(evt.target.value)}
                onBlur={() => {
                    if (current !== monitor) {
                        setValue(current);
                        updateFn();
                    }
                }}
                value={current}
            />
            {notes ? <p className="textarea--note text-italic">{notes}</p> : null}
        </>
    );
}
