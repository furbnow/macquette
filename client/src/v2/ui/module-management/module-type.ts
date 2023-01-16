import type { Result } from '../../helpers/result';
import type { Externals } from '../../shims/typed-globals';
import type { ShimContext } from './shim';

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
    initialState: (instanceKey: string) => State;
    reducer: (state: State, action: Action) => [State, Array<Effect>?];
    component: React.FC<Props>;
    effector: (effect: Effect, dispatch: Dispatcher<Action>) => Promise<void>;
};

export type UiModule<State, Action, Effect> = ReducerComponent<State, Action, Effect> & {
    shims: {
        extractUpdateAction: (
            shimContext: ShimContext,
            instanceKey: string,
        ) => Result<Action, Error>;
        mutateLegacyData: (
            externals: Pick<Externals, 'project' | 'scenarioId'>,
            state: State,
            instanceKey: string,
        ) => void;
    };
};
