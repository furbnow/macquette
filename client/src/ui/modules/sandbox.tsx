import React from 'react';

import { assertNever } from '../../helpers/assert-never';
import { Result } from '../../helpers/result';
import type { UiModule } from '../module-management/module-type';

type State = { donks: number };
type Action = { type: 'put a donk on it' };

export const sandboxModule: UiModule<State, Action, never> = {
  name: 'sandbox',
  component: function Sandbox({ state, dispatch }) {
    const { donks } = state;

    let display: string;
    if (donks === 0) {
      display = 'hello world';
    } else {
      display = 'hello ' + new Array(donks).fill('donk').join(' ');
    }
    return (
      <div>
        <div>{display}</div>
        <div>
          <button onClick={() => dispatch({ type: 'put a donk on it' })}>
            put a donk on it
          </button>
        </div>
      </div>
    );
  },
  initialState: () => {
    return { donks: 0 };
  },
  reducer: (state, action) => {
    switch (action.type) {
      case 'put a donk on it':
        return [{ donks: state.donks + 1 }];
    }
  },
  effector: assertNever,
  shims: {
    extractUpdateAction: () => {
      return Result.err(new Error('external update handling not implemented'));
    },
    mutateLegacyData: () => undefined,
  },
};
