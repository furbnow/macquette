import React, { useId } from 'react';

import { SuspendedFloorSpec } from '../../../../../data-schemas/scenario/fabric/floor-u-value';
import { safeMerge } from '../../../../../helpers/safe-merge';
import { CheckboxInput } from '../../../../input-components/checkbox';
import { FormGrid, LabelWithInfo } from '../../../../input-components/forms';
import { NumericInput } from '../../../../input-components/numeric';
import { CombinedMethod } from '../shared-components/combined-method';
import type { Action as FloorUValueCalculatorAction } from '../state/reducer';

export type State = SuspendedFloorSpec;

type MergeState = {
    type: 'suspended floor/merge state';
    payload: Partial<Omit<State, 'insulation'>> & {
        insulation?: Partial<State['insulation']>;
    };
};
export type Action = MergeState;

export function reducer(state: State, action: FloorUValueCalculatorAction): State {
    switch (action.type) {
        case 'suspended floor/merge state': {
            const newState = safeMerge(state, action.payload);
            // Special handling for layers array, since safeMerge will merge arrays
            if (action.payload.insulation?.layers !== undefined) {
                newState.insulation.layers = action.payload.insulation.layers;
            }
            return newState;
        }
    }
    return state;
}

type Props = { state: State; dispatch: React.Dispatch<FloorUValueCalculatorAction> };
export function Component({ state, dispatch }: Props) {
    const ventilationId = useId();
    const underFloorId = useId();
    const insulationId = useId();

    return (
        <>
            <FormGrid>
                <LabelWithInfo
                    htmlFor={ventilationId}
                    infoText={
                        <>
                            This is the sum of the ventilation area of each individual
                            underfloor ventilation point. For example two air bricks of
                            1300 mm² free air space each equates to 2600 mm² in this
                            input.
                        </>
                    }
                >
                    Total area of ventilation points
                </LabelWithInfo>
                <NumericInput
                    id={ventilationId}
                    value={
                        state.ventilationCombinedArea === null
                            ? null
                            : state.ventilationCombinedArea * 1_000_000
                    }
                    callback={(value) =>
                        dispatch({
                            type: 'suspended floor/merge state',
                            payload: {
                                ventilationCombinedArea:
                                    value === null ? null : value / 1_000_000,
                            },
                        })
                    }
                    unit="mm²"
                />
                <LabelWithInfo
                    htmlFor={underFloorId}
                    infoText={
                        <>
                            This is the <b>entire underfloor perimeter</b>, as opposed to
                            just the exposed perimeter.
                        </>
                    }
                >
                    Perimeter of underfloor space
                </LabelWithInfo>
                <NumericInput
                    id={underFloorId}
                    value={state.underFloorSpacePerimeter}
                    callback={(value) =>
                        dispatch({
                            type: 'suspended floor/merge state',
                            payload: { underFloorSpacePerimeter: value },
                        })
                    }
                    unit="m"
                />

                <label htmlFor={insulationId}>Insulated floor?</label>
                <span>
                    <CheckboxInput
                        id={insulationId}
                        checked={state.insulation.enabled}
                        callback={(checked) =>
                            dispatch({
                                type: 'suspended floor/merge state',
                                payload: { insulation: { enabled: checked } },
                            })
                        }
                    />
                </span>
            </FormGrid>

            {state.insulation.enabled && (
                <CombinedMethod
                    layers={state.insulation.layers}
                    onChange={(layers) =>
                        dispatch({
                            type: 'suspended floor/merge state',
                            payload: { insulation: { layers } },
                        })
                    }
                />
            )}
        </>
    );
}
