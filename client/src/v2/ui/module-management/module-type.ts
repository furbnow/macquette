import type { Result } from '../../helpers/result';
import type { Externals } from '../../shims/typed-globals';
import type { LegacyContext } from './shim';

export type BasicProps<State, Action> = {
    state: State;
    dispatch: (action: Action) => void;
};

export type ReducerComponent<
    State,
    Action,
    Props extends BasicProps<State, Action> = BasicProps<State, Action>,
> = {
    name: string;
    initialState: (instanceKey: string) => State;
    reducer: (state: State, action: Action) => State;
    component: React.FC<Props>;
};

export type UiModule<State, Action> = ReducerComponent<State, Action> & {
    shims: {
        extractUpdateAction: (
            legacyContext: LegacyContext,
            instanceKey: string,
        ) => Result<Action, Error>;
        mutateLegacyData: (
            externals: Pick<Externals, 'project' | 'scenarioId'>,
            state: State,
            instanceKey: string,
        ) => void;
    };
};
