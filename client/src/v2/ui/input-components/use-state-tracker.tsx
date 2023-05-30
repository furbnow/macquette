import { useState } from 'react';

export function useStateTracker<State>(currentOuterState: State) {
    const [previousOuterState, setPreviousOuterState] =
        useState<State>(currentOuterState);
    const [innerState, setInnerState] = useState<State>(currentOuterState);
    if (previousOuterState !== currentOuterState) {
        setPreviousOuterState(currentOuterState);
        setInnerState(currentOuterState);
    }
    return [innerState, setInnerState] as const;
}
