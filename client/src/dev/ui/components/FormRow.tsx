import React, { ReactElement } from 'react';

interface FormRowProps {
    indent?: boolean;
    narrow?: boolean;
    children: React.ReactNode;
}

export default function FormRow({
    indent = false,
    narrow = false,
    children,
}: FormRowProps): ReactElement {
    return (
        <div
            className={`form-row ${indent ? 'form-row--indent' : ''} ${
                narrow ? 'form-row--narrow' : ''
            }`}
        >
            {children}
        </div>
    );
}
