import React from 'react';
import type { UiModule } from '../module-management';

export type SandboxState = { donks: number };
export type SandboxAction = { type: 'sandbox/put a donk on it' };

export const sandboxModule: UiModule<SandboxState> = {
    initialState: {
        donks: 0,
    },
    reducer: (state, action) => {
        switch (action.type) {
            case 'sandbox/put a donk on it':
                state.donks += 1;
                break;
        }
        return state;
    },
    rootComponent: ({ state, dispatch }) => {
        let display: string;
        if (state.donks === 0) {
            display = 'hello world';
        } else {
            display = 'hello ' + new Array(state.donks).fill('donk').join(' ');
        }
        return (
            <div>
                <div>{display}</div>
                <div>
                    <button
                        onClick={() => dispatch({ type: 'sandbox/put a donk on it' })}
                    >
                        put a donk on it
                    </button>
                </div>
            </div>
        );
    },
    dataMutator: () => {
        // Pass
    },
};
