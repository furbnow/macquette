import type { AppAction } from './module-management';

export type CommonState = {
    locked: boolean;
};

export const initialCommonState: CommonState = {
    locked: false,
};

export const commonStateReducer = (
    state: CommonState,
    action: AppAction,
): CommonState => {
    if (action.type === 'external data update') {
        state.locked = action.data.locked ?? false;
        return state;
    }
    return state;
};
