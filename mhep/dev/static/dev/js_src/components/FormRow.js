import React from 'react';

export default function FormRow({ children, narrow }) {
    return <div className={`form-row ${narrow?'form-row--narrow':''}`}>{children}</div>;
}
