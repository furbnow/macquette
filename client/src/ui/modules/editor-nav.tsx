import React from 'react';
import { assertNever } from '../../helpers/assert-never';
import { Result } from '../../helpers/result';
import type { UiModule } from '../module-management/module-type';

export type Action = { type: 'new data'; state: State };
export type State = { name: string; description: string };

function EditorNav({ state }: { state: State }) {
    return (
        <div style={{ marginLeft: '5px' }}>
            <h1 className="nav-main-heading">{state.name}</h1>
            <span>{state.description}</span>
        </div>
    );
}

export const navModule: UiModule<State, Action, never> = {
    name: 'editorNav',
    component: EditorNav,
    initialState: () => {
        return { name: '-', description: '-' };
    },
    reducer: (state, action) => {
        switch (action.type) {
            case 'new data': {
                return [action.state];
            }
        }
    },
    effector: assertNever,
    shims: {
        extractUpdateAction: ({ project }) => {
            return Result.ok([
                {
                    type: 'new data',
                    state: { name: project.name, description: project.description },
                },
            ]);
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        mutateLegacyData: () => {},
    },
};
