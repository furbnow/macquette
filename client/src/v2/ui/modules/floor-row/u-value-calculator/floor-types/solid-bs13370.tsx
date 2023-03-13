import React, { useId } from 'react';

import { SolidFloorBS13370Spec } from '../../../../../data-schemas/scenario/fabric/floor-u-value';
import { DeepPartial, safeMerge } from '../../../../../helpers/safe-merge';
import {
    ChoiceSection,
    FormGrid,
    LabelWithInfo,
} from '../../../../input-components/forms';
import { NumberInput } from '../../../../input-components/number';
import { Select } from '../../../../input-components/select';
import { CombinedMethod } from '../shared-components/combined-method';
import { InsulationInput } from '../shared-components/insulation-input';
import type { Action as FloorUValueCalculatorAction } from '../state/reducer';

export type State = SolidFloorBS13370Spec;

type MergeInput = {
    type: 'solid floor (bs13370)/merge input';
    payload: DeepPartial<State>;
};
export type Action = MergeInput;

export function reducer(state: State, action: FloorUValueCalculatorAction): State {
    switch (action.type) {
        case 'solid floor (bs13370)/merge input': {
            const newState = safeMerge(state, action.payload);
            // Special handling for layers array, since safeMerge will merge arrays
            if (action.payload.layers !== undefined) {
                newState.layers = action.payload.layers;
            }
            return newState;
        }
        default:
            return state;
    }
}

export function Component({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<FloorUValueCalculatorAction>;
}) {
    const wallThicknessId = useId();
    const groundConductivityId = useId();
    function mergeInput(payload: DeepPartial<State>) {
        return dispatch({ type: 'solid floor (bs13370)/merge input', payload });
    }
    return (
        <>
            <FormGrid>
                <label htmlFor={wallThicknessId}>Wall thickness</label>
                <NumberInput
                    id={wallThicknessId}
                    value={
                        state.wallThickness === null ? null : state.wallThickness * 1000
                    }
                    callback={(value) =>
                        mergeInput({
                            wallThickness: value === null ? null : value / 1000,
                        })
                    }
                    unit={'mm'}
                />
                <label htmlFor={groundConductivityId}>Ground conductivity</label>
                <div>
                    <Select
                        id={groundConductivityId}
                        options={[
                            { value: 'unknown', display: 'Unknown (2.0 W/mK)' },
                            {
                                value: 'clay or silt',
                                display: 'Clay or silt (1.5 W/mK)',
                            },
                            {
                                value: 'sand or gravel',
                                display: 'Sand or gravel (2.0 W/mK)',
                            },
                            {
                                value: 'homogenous rock',
                                display: 'Homogenous rock (3.5 W/mK)',
                            },
                            { value: 'custom', display: 'Custom' },
                        ]}
                        selected={state.groundConductivity.groundType}
                        callback={(value) =>
                            mergeInput({ groundConductivity: { groundType: value } })
                        }
                    />
                    {state.groundConductivity.groundType === 'custom' && (
                        <>
                            {' '}
                            <NumberInput
                                value={state.groundConductivity.customValue}
                                callback={(value) =>
                                    mergeInput({
                                        groundConductivity: { customValue: value },
                                    })
                                }
                                unit="W/mK"
                            />{' '}
                        </>
                    )}
                </div>
                <ChoiceSection
                    value={state.edgeInsulation.selected ?? ('none' as const)}
                    onChange={(value) =>
                        mergeInput({
                            edgeInsulation: { selected: value === 'none' ? null : value },
                        })
                    }
                    choices={[
                        { value: 'none', display: 'None', child: null },
                        {
                            value: 'horizontal',
                            display: 'Horizontal',
                            child: (
                                <HorizontalEdgeInsulation
                                    state={state.edgeInsulation.horizontal}
                                    dispatch={dispatch}
                                />
                            ),
                        },
                        {
                            value: 'vertical',
                            display: 'Vertical',
                            child: (
                                <VerticalEdgeInsulation
                                    state={state.edgeInsulation.vertical}
                                    dispatch={dispatch}
                                />
                            ),
                        },
                    ]}
                    selectText="Edge insulation"
                />
            </FormGrid>
            <CombinedMethod
                layers={state.layers}
                onChange={(value) => mergeInput({ layers: value })}
            />
        </>
    );
}

function HorizontalEdgeInsulation({
    state,
    dispatch,
}: {
    state: State['edgeInsulation']['horizontal'];
    dispatch: React.Dispatch<FloorUValueCalculatorAction>;
}) {
    const widthId = useId();
    return (
        <>
            <LabelWithInfo
                htmlFor={widthId}
                infoText={
                    <>
                        This is the distance that the edge insulation extends horizontally
                        away from the wall, along the underside of the floor slab. It is{' '}
                        <b>not</b> the thickness of the insulation material.
                    </>
                }
            >
                Edge insulation width
            </LabelWithInfo>
            <NumberInput
                value={state.width === null ? null : state.width * 1000}
                callback={(value) =>
                    dispatch({
                        type: 'solid floor (bs13370)/merge input',
                        payload: {
                            edgeInsulation: {
                                horizontal: {
                                    width: value === null ? null : value / 1000,
                                },
                            },
                        },
                    })
                }
                unit="mm"
            />
            <InsulationInput
                thicknessMandatory
                thicknessLabel="Edge insulation thickness"
                materialLabel="Edge insulation material"
                currentValue={state}
                onChange={(value) =>
                    dispatch({
                        type: 'solid floor (bs13370)/merge input',
                        payload: { edgeInsulation: { horizontal: value } },
                    })
                }
            />
        </>
    );
}

function VerticalEdgeInsulation({
    state,
    dispatch,
}: {
    state: State['edgeInsulation']['vertical'];
    dispatch: React.Dispatch<FloorUValueCalculatorAction>;
}) {
    const depthId = useId();
    return (
        <>
            <LabelWithInfo
                htmlFor={depthId}
                infoText={
                    <>
                        This is the distance that the edge insulation extends vertically
                        downwards below the ground level, adjacent to the foundation wall.
                        It is <b>not</b> the thickness of the insulation material.
                    </>
                }
            >
                Edge insulation depth
            </LabelWithInfo>
            <NumberInput
                id={depthId}
                value={state.depth === null ? null : state.depth * 1000}
                callback={(value) =>
                    dispatch({
                        type: 'solid floor (bs13370)/merge input',
                        payload: {
                            edgeInsulation: {
                                vertical: { depth: value === null ? null : value / 1000 },
                            },
                        },
                    })
                }
                unit="mm"
            />
            <InsulationInput
                thicknessMandatory
                thicknessLabel="Edge insulation thickness"
                materialLabel="Edge insulation material"
                currentValue={state}
                onChange={(value) =>
                    dispatch({
                        type: 'solid floor (bs13370)/merge input',
                        payload: { edgeInsulation: { vertical: value } },
                    })
                }
            />
        </>
    );
}
