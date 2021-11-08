import React, { useContext, ReactElement } from 'react';
import useExternalState from '../hooks/useExternalState';
import { AppContext } from '../context/AppContext';

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
    const { update } = useContext(AppContext);
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
                        update();
                    }
                }}
                value={current}
            />
            {notes ? <p className="textarea--note text-italic">{notes}</p> : null}
        </>
    );
}
