import React from 'react';

type FormRowProps = {
    narrow?: boolean,
    children?: any,
}

export default function FormRow({narrow, children}: FormRowProps) {
    return <div className={`form-row ${narrow?'form-row--narrow':''}`}>{children}</div>;
}
