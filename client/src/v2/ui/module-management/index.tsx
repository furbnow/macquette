import { mapValues } from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { ModuleAction, ModuleName, modules, ModuleStates } from '../modules';
import { externals } from './shim';
import { Store } from './store';

export type UiModule<StateT> = {
    initialState: StateT;
    reducer: (state: StateT, action: AppAction) => StateT;
    dataMutator: (data: unknown, state: AppState) => void;
    rootComponent: React.FunctionComponent<{
        state: StateT;
        dispatch: (action: AppAction) => void;
    }>;
};

export type ExternalDataUpdateAction = { type: 'external data update'; data: unknown };
export type AppState = {
    dirty: boolean;
    moduleStates: ModuleStates;
};
export type AppAction = ExternalDataUpdateAction | ModuleAction;

const mainReducer = (state: AppState, action: AppAction): AppState => {
    state.dirty = action.type !== 'external data update';
    for (const moduleName of Object.keys(modules)) {
        // TypeScript is not clever enough to match up the types between
        // modules[moduleName].reducer and state.moduleStates[moduleName], so
        // we use a few `any`s and turn off some of linter's safety checks.
        //
        // This is sound as long as the module state type in `ModuleStates` is
        // consistent with the type of the first parameter of the reducer.

        /* eslint-disable
           @typescript-eslint/no-explicit-any,
           @typescript-eslint/no-unsafe-member-access,
           @typescript-eslint/no-unsafe-assignment,
           @typescript-eslint/no-unsafe-call,
           @typescript-eslint/consistent-type-assertions,
        */
        const moduleStates: any = state.moduleStates;
        moduleStates[moduleName] = (modules as any)[moduleName].reducer(
            moduleStates[moduleName],
            action,
        );
        /* eslint-enable */
    }
    return state;
};

const initialState: AppState = {
    dirty: false,
    moduleStates: mapValues(modules, (mod) => mod.initialState),
};
const store = new Store(mainReducer, initialState);

export const mount = (moduleName: ModuleName, mountPoint: HTMLElement) => {
    const { rootComponent } = modules[moduleName];
    const dispatch = (action: AppAction) => store.dispatch(action);
    const render = (appState: AppState) => {
        console.log('in render', { moduleName, mountPoint });
        const moduleState = appState.moduleStates[moduleName];
        const element = React.createElement(rootComponent, {
            state: moduleState,
            dispatch,
        });
        ReactDOM.render(element, mountPoint);
    };
    render(store.state);
    store.subscribe(render);
    return {
        update: () => {
            console.log('in update', { moduleName, mountPoint });
            store.dispatch({
                type: 'external data update',
                data: externals().data,
            });
        },
        unload: () => {
            console.log('in unload', { moduleName, mountPoint });
            store.unsubscribe(render);
            ReactDOM.unmountComponentAtNode(mountPoint);
        },
    };
};

store.subscribe((state) => {
    if (state.dirty) {
        runDataMutators(state);
        externals().update();
    }
});

export const runDataMutators = (appState: AppState) => {
    for (const mod of Object.values(modules)) {
        mod.dataMutator(externals().data, appState);
    }
};
