import React from 'react';

import { WarningFilledIcon } from '../icons/warning';

export type LockedWarningProps = {
    locked: boolean;
};

export function LockedWarning({ locked }: LockedWarningProps) {
    if (!locked) {
        return <></>;
    } else {
        return (
            <div className="scenario-locked-warning">
                <WarningFilledIcon /> You cannot make changes to this page because the
                scenario is locked.
            </div>
        );
    }
}
