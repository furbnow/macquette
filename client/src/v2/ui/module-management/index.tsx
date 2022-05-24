import { cloneDeep, isEqual, mapValues } from 'lodash';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { Project, projectSchema } from '../../data-schemas/project';
import { Scenario } from '../../data-schemas/scenario';
import { CommonState, commonStateReducer, initialCommonState } from '../common-state';
import { ModuleAction, ModuleName, modules, ModuleStates } from '../modules';
import { externals } from './shim';
import { Store } from './store';

type ModuleStateView<StateT> = {
    commonState: CommonState;
    moduleState: StateT;
};
const moduleStateView = (
    appState: AppState,
    moduleName: ModuleName,
): ModuleStateView<unknown> => {
    const { moduleStates, commonState } = appState;
    return { commonState, moduleState: moduleStates[moduleName] };
};
export type UiModule<StateT> = {
    initialState: StateT;
    reducer: (state: StateT, action: AppAction) => StateT;
    dataMutator: (
        externals: { project: unknown; scenarioId: unknown },
        state: ModuleStateView<StateT>,
    ) => void;
    rootComponent: React.FunctionComponent<{
        state: ModuleStateView<StateT>;
        dispatch: (action: AppAction) => void;
    }>;
};

export type ExternalDataUpdateAction = {
    type: 'external data update';
    project: Project;
    currentScenario: Scenario;
    currentScenarioId: string;
};
export type AppState = {
    dirty: boolean;
    moduleStates: ModuleStates;
    commonState: CommonState;
};
export type AppAction = ExternalDataUpdateAction | ModuleAction;

const mainReducer = (state: AppState, action: AppAction): AppState => {
    state.dirty = action.type !== 'external data update';
    state.commonState = commonStateReducer(state.commonState, action);
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
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    moduleStates: mapValues(modules, (mod) => mod.initialState) as ModuleStates,
    commonState: initialCommonState,
};
const store = new Store(mainReducer, initialState);

export const mount = (moduleName: ModuleName, mountPoint: HTMLElement) => {
    const root = createRoot(mountPoint);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rootComponent: any = modules[moduleName].rootComponent;
    const dispatch = (action: AppAction) => store.dispatch(action);
    const render = (appState: AppState) => {
        const element = React.createElement(rootComponent, {
            state: moduleStateView(appState, moduleName),
            dispatch,
        });
        root.render(element);
    };
    render(store.state);
    store.subscribe(render);
    return {
        update: () => {
            const projectParseResult = projectSchema.safeParse(externals().project);
            if (!projectParseResult.success) {
                console.error(
                    'Project validation failed! Refusing to dispatch external data update action',
                    projectParseResult.error,
                );
                return;
            }
            const project = projectParseResult.data;

            const currentScenarioId = externals().scenarioId;
            if (typeof currentScenarioId !== 'string') {
                console.error(
                    'Scenario ID validation failed! Refusing to dispatch external data update action',
                );
                return;
            }

            const currentScenario = project.data[currentScenarioId];
            if (currentScenario === undefined) {
                console.error(
                    'Scenario ID was not present in project! Refusing to dispatch external data update action',
                );
                return;
            }

            store.dispatch({
                type: 'external data update',
                project,
                currentScenario,
                currentScenarioId,
            });
        },
        unload: () => {
            console.log('in unload', { moduleName, mountPoint });
            store.unsubscribe(render);
            root.unmount();
        },
    };
};

store.subscribe((state) => {
    if (state.dirty) {
        runDataMutators(state);
    }
});

export const runDataMutators = (appState: AppState) => {
    const origProject = cloneDeep(externals().project);
    for (const [modName, mod] of Object.entries(modules)) {
        /* eslint-disable
           @typescript-eslint/no-explicit-any,
           @typescript-eslint/no-unsafe-member-access,
           @typescript-eslint/no-unsafe-assignment,
           @typescript-eslint/no-unsafe-argument,
           @typescript-eslint/consistent-type-assertions,
        */
        const view: ModuleStateView<any> = moduleStateView(
            appState,
            modName as ModuleName,
        );
        mod.dataMutator(externals(), view);
        /* eslint-enable */
    }

    if (!isEqual(origProject, externals().project)) {
        externals().update();
    }
};
