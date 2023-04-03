import { ZodError } from 'zod';
import { Project } from '../../data-schemas/project';
import { Scenario } from '../../data-schemas/scenario';
import type { Result } from '../../helpers/result';
import { CombinedModules } from '../../model/combined-modules';
import { ModelError } from '../../model/error';
import type { Externals } from '../../shims/typed-globals';
import { Route } from '../routes';

export type AppContext = {
    route: Route;
    project: Project;
    scenarioId: string | null;
    currentScenario: Scenario;
    currentModel: Result<CombinedModules, ZodError<unknown> | ModelError>;
    appName: string;
};

export type Dispatcher<Action> = (action: Action) => void;

export type BasicProps<State, Action> = {
    state: State;
    dispatch: Dispatcher<Action>;
};

export type ReducerComponent<
    State,
    Action,
    Effect,
    Props extends BasicProps<State, Action> = BasicProps<State, Action>,
> = {
    name: string;
    initialState: (instanceKey: string | null) => State;
    reducer: (state: State, action: Action) => [State, Array<Effect>?];
    component: React.FC<Props>;
    effector: (effect: Effect, dispatch: Dispatcher<Action>) => Promise<void>;
};

export type UiModule<State, Action, Effect> = ReducerComponent<State, Action, Effect> & {
    shims: {
        extractUpdateAction: (
            context: AppContext,
            instanceKey: string | null,
        ) => Result<Action, Error>;
        mutateLegacyData: (
            externals: Pick<Externals, 'project'>,
            context: Pick<AppContext, 'scenarioId'>,
            state: State,
            instanceKey: string | null,
        ) => void;
    };
};
