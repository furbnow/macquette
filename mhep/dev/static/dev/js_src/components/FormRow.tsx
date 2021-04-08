import React from 'react';

interface IFormRow {
    narrow?: boolean,
    children?: any,
}

export default function FormRow({narrow, children}: IFormRow) {
    return <div className={`form-row ${narrow?'form-row--narrow':''}`}>{children}</div>;
}
