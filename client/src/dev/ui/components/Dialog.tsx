import React, { useEffect, useCallback, ReactElement } from 'react';

interface DialogProps {
    /** HTML id for the header that labels this dialog */
    headerId: string;
    /** Function to be called when dialog closes */
    onClose: () => void;
    children: ReactElement | ReactElement[];
}

export default function Dialog({
    headerId,
    onClose,
    children,
}: DialogProps): ReactElement {
    // WAI-ARIA-PRACTICES says we should have Escape as a way to close the dialog
    const escapeKeyHandler = useCallback(
        (evt: KeyboardEvent) => {
            if (evt.code === 'Escape') {
                onClose();
            }
        },
        [onClose],
    );

    useEffect(() => {
        document.addEventListener('keydown', escapeKeyHandler, false);
        // We need to put has_dialog on the body to remove the scrollbar
        document.body.classList.add('has_dialog');
        return () => {
            document.removeEventListener('keydown', escapeKeyHandler, false);
            document.body.classList.remove('has_dialog');
        };
    }, [escapeKeyHandler]);

    return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
            className="dialog-backdrop"
            onClick={(evt) => {
                // Clicking on the backdrop (but not its nested children) should also
                // close the dialog
                const target = evt.target as HTMLDivElement;
                if (target.className === 'dialog-backdrop') {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={headerId}
                className="notbootstrap"
            >
                {children}
            </div>
        </div>
    );
}
