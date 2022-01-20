export class Store<StateT, ActionT> {
    private _state: StateT;
    private _reducer: (state: StateT, action: ActionT) => StateT;
    private _subscribers: Set<(state: StateT) => void> = new Set();

    constructor(
        reducer: (state: StateT, action: ActionT) => StateT,
        initialState: StateT,
    ) {
        this._state = initialState;
        this._reducer = reducer;
    }

    public get state(): StateT {
        return this._state;
    }

    public dispatch(action: ActionT) {
        // Reducers are written under the assumption that they may mutate their
        // arguments, and they will not be used again elsewhere. This is true
        // for now, since we pass `this._state` into the reducer and then
        // immediately assign the result back to `this._state`. If, however, we
        // later decide to produce state diffs, or keep state history for
        // undo/redo, or do something else that relies on having the old state
        // around, we might consider deep-cloning the state, or using Immer
        // like Redux does.
        const newState = this._reducer(this._state, action);
        this._state = newState;
        this._subscribers.forEach((subscriber) => subscriber(this._state));
    }

    public subscribe(subscriber: (state: StateT) => void) {
        this._subscribers.add(subscriber);
    }

    public unsubscribe(subscriber: (state: StateT) => void) {
        this._subscribers.delete(subscriber);
    }
}
