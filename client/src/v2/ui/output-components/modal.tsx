import React, { useEffect, useCallback, ReactElement, ReactNode, useId } from 'react';

import { PropsOf } from '../../helpers/props-of';
import { Shadow } from '../../helpers/shadow-object-type';

interface ModalProps {
    /** HTML id for the header that labels this dialog */
    headerId: string;
    /** Function to be called when dialog closes */
    onClose: () => void;
    children: ReactNode;
}

export function Modal({ headerId, onClose, children }: ModalProps): ReactElement {
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

                // SAFETY: We know this is a <div>.
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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

type ModalHeaderProps = {
    title: string;
    children?: ReactNode;
    onClose: () => void;
};

export function ModalHeader({ title, children, onClose }: ModalHeaderProps) {
    return (
        <div className="dialog-header">
            <div className="d-flex justify-content-between">
                <h4 className="mt-0 mb-7" id="modal-header">
                    {title}
                </h4>

                <div>
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={onClose}
                        className="dialog-x"
                    >
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 44 44"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <path d="M0.549989 4.44999L4.44999 0.549988L43.45 39.55L39.55 43.45L0.549989 4.44999Z" />
                            <path d="M39.55 0.549988L43.45 4.44999L4.44999 43.45L0.549988 39.55L39.55 0.549988Z" />
                        </svg>
                    </button>
                </div>
            </div>
            {children}
        </div>
    );
}

type BasicModalBodyProps = {
    children: ReactNode;
};
type ModalBodyProps = Shadow<PropsOf<'div'>, BasicModalBodyProps>;

export function ModalBody({ children, ...passthrough }: ModalBodyProps) {
    return (
        <div className="dialog-body" {...passthrough}>
            {children}
        </div>
    );
}

type ModalFooterProps = {
    children: ReactNode;
};
export function ModalFooter({ children }: ModalFooterProps) {
    return <div className="modal-footer">{children}</div>;
}

type ErrorModalProps = {
    onClose: () => void;
    title: string;
    children: ReactNode;
};
export function ErrorModal({ onClose, children, title }: ErrorModalProps) {
    const headerId = useId();
    return (
        <Modal headerId={headerId} onClose={onClose}>
            <ModalHeader title={title} onClose={onClose} />
            <ModalBody>{children}</ModalBody>
            <ModalFooter>
                <button onClick={onClose} className="btn btn-danger">
                    Close
                </button>
            </ModalFooter>
        </Modal>
    );
}
