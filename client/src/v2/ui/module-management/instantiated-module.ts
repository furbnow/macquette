import { createElement } from 'react';
import { createRoot, Root as ReactDOMRoot } from 'react-dom/client';
import { Externals } from '../../shims/typed-globals';

import type { AppContext, UiModule } from './module-type';

export class InstantiatedUiModule<State, Action, Effect> {
    private state: State;
    private root: ReactDOMRoot | null;

    constructor(
        private module_: UiModule<State, Action, Effect>,
        private instanceKey: string | null,
        domElement: Element,
        private handleDataMutator?: (
            mutator: (toMutate: Pick<Externals, 'project'>, context: AppContext) => void,
        ) => void,
    ) {
        this.root = createRoot(domElement);
        this.state = module_.initialState(instanceKey);
        this.render();
    }

    unmount() {
        if (this.root === null) {
            console.error('Tried to unmount an already unmounted UI module');
        } else {
            this.root.unmount();
            this.root = null;
        }
    }

    update(context: AppContext) {
        const actionR = this.module_.shims.extractUpdateAction(context, this.instanceKey);
        if (!actionR.isOk()) {
            console.error(actionR.coalesce());
            return;
        }
        const action = actionR.coalesce();
        this.dispatch(action, false);
        this.render();
    }

    private render() {
        if (this.root === null) {
            // Root has gone away; maybe we are processing an async effect
            // after we have been unmounted
            console.warn('Cannot render on an unmounted root');
            return;
        }
        this.root.render(
            createElement(this.module_.component, {
                state: this.state,
                dispatch: (action) => this.dispatch(action, true),
            }),
        );
    }

    private dispatch(action: Action, internal: boolean): void {
        const [newState, effects] = this.module_.reducer(this.state, action);
        this.state = newState;
        for (const effect of effects ?? []) {
            this.module_
                .effector(effect, (action) => this.dispatch(action, true))
                .catch((err) => {
                    alert(err);
                    console.error(err);
                });
        }
        this.render();
        if (internal && this.handleDataMutator !== undefined) {
            this.handleDataMutator((toMutate, appContext) =>
                this.module_.shims.mutateLegacyData(
                    toMutate,
                    appContext,
                    this.state,
                    this.instanceKey,
                ),
            );
        }
    }
}