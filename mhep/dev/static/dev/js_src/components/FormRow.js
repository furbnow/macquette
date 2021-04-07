import React from 'react';

export default function FormRow({ children, narrow, indent }) {
    return (
        <div
            className={`form-row ${indent ? 'form-row--indent' : ''} ${narrow ? 'form-row--narrow' : ''}`}
        >
            {children}
        </div>
    )
}
