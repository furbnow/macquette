import React, { useId } from 'react';

import { ExposedFloorSpec } from '../../../../../data-schemas/scenario/fabric/floor-u-value';
import { safeMerge } from '../../../../../helpers/safe-merge';
import { FormGrid } from '../../../../input-components/forms';
import { Select } from '../../../../input-components/select';
import { CombinedMethod } from '../shared-components/combined-method';
import type { Action as FloorUValueCalculatorAction } from '../state/reducer';

export type State = ExposedFloorSpec;

type MergeState = {
    type: 'exposed floor/merge state';
    payload: Partial<State>;
};
export type Action = MergeState;

export function reducer(state: State, action: FloorUValueCalculatorAction): State {
    switch (action.type) {
        case 'exposed floor/merge state': {
            const newState = safeMerge(state, action.payload);
            // Special handling for layers array, since safeMerge will merge arrays
            if (action.payload.layers !== undefined) {
                newState.layers = action.payload.layers;
            }
            return newState;
        }
    }
    return state;
}

export function Component({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}) {
    const exposedToId = useId();

    return (
        <>
            <FormGrid>
                <label htmlFor={exposedToId}>Exposed to</label>
                <Select
                    id={exposedToId}
                    options={[
                        { value: 'unheated space', display: 'Unheated space' },
                        { value: 'outside air', display: 'Outside air' },
                    ]}
                    value={state.exposedTo}
                    onChange={(value) =>
                        dispatch({
                            type: 'exposed floor/merge state',
                            payload: { exposedTo: value },
                        })
                    }
                />
            </FormGrid>

            <CombinedMethod
                layers={state.layers}
                onChange={(layers) =>
                    dispatch({
                        type: 'exposed floor/merge state',
                        payload: { layers },
                    })
                }
            />
        </>
    );
}
