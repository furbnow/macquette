import React from 'react';

import { WarningFilledIcon } from '../icons';

export type LockedWarningProps = {
    locked: boolean;
};

export function LockedWarning({ locked }: LockedWarningProps) {
    if (!locked) {
        return <></>;
    } else {
        return (
            <div className="scenario-locked-warning mb-15">
                <WarningFilledIcon /> You cannot make changes to this page because the
                scenario is locked.
            </div>
        );
    }
}
