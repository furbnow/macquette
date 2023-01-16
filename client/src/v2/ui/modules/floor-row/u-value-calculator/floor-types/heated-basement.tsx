import React, { useId } from 'react';

import { HeatedBasementFloorSpec } from '../../../../../data-schemas/scenario/fabric/floor-u-value';
import { safeMerge } from '../../../../../helpers/safe-merge';
import { FormGrid, OptionalSection } from '../../../../input-components/forms';
import { NumericInput } from '../../../../input-components/numeric';
import { InsulationInput } from '../shared-components/insulation-input';
import type { Action as FloorUValueCalculatorAction } from '../state/reducer';

export type State = HeatedBasementFloorSpec;

type MergeState = {
    type: 'unheated basement/merge state';
    payload: Partial<Omit<State, 'insulation'>> & {
        insulation?: Partial<State['insulation']>;
    };
};
export type Action = MergeState;

export function reducer(state: State, action: FloorUValueCalculatorAction): State {
    switch (action.type) {
        case 'unheated basement/merge state':
            return safeMerge(state, action.payload);
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
    const depthId = useId();
    return (
        <FormGrid>
            <label htmlFor={depthId}>Basement depth</label>
            <NumericInput
                id={depthId}
                value={state.basementDepth}
                callback={(value) =>
                    dispatch({
                        type: 'unheated basement/merge state',
                        payload: { basementDepth: value },
                    })
                }
                unit="m"
            />

            <OptionalSection
                open={state.insulation.enabled}
                onChange={(value) =>
                    dispatch({
                        type: 'unheated basement/merge state',
                        payload: { insulation: { enabled: value } },
                    })
                }
                checkboxText="Insulated floor?"
            >
                <InsulationInput
                    currentValue={state.insulation}
                    onChange={(value) =>
                        dispatch({
                            type: 'unheated basement/merge state',
                            payload: { insulation: value },
                        })
                    }
                />
            </OptionalSection>
        </FormGrid>
    );
}
