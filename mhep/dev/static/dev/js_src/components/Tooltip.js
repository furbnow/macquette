import React from 'react';

export default function Tooltip({ children }) {
    return <i className="icon-question-sign" title={children}></i>;
}
