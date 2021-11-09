import React, { ReactElement } from 'react';

interface FormRowProps {
    narrow?: boolean;
    children: React.ReactNode;
}

export default function FormRow({
    narrow = false,
    children,
}: FormRowProps): ReactElement {
    return (
        <div className={`form-row ${narrow ? 'form-row--narrow' : ''}`}>{children}</div>
    );
}
