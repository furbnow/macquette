import React, { useId } from 'react';

import { SolidFloorSpec } from '../../../../../data-schemas/scenario/fabric/floor-u-value';
import { DeepPartial, safeMerge } from '../../../../../helpers/safe-merge';
import {
    ChoiceSection,
    FormGrid,
    LabelWithInfo,
    OptionalSection,
} from '../../../../input-components/forms';
import { NumericInput } from '../../../../input-components/numeric';
import { InsulationInput } from '../shared-components/insulation-input';
import type { Action as FloorUValueCalculatorAction } from '../state/reducer';

export type State = SolidFloorSpec;

type MergeInput = { type: 'solid floor/merge input'; payload: DeepPartial<State> };
export type Action = MergeInput;

export function reducer(state: State, action: FloorUValueCalculatorAction): State {
    switch (action.type) {
        case 'solid floor/merge input': {
            return safeMerge(state, action.payload);
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
    return (
        <FormGrid>
            <OptionalSection
                open={state.allOverInsulation.enabled}
                onChange={(value) => {
                    dispatch({
                        type: 'solid floor/merge input',
                        payload: { allOverInsulation: { enabled: value } },
                    });
                }}
                checkboxText="All-over insulation"
            >
                <InsulationInput
                    indent
                    currentValue={state.allOverInsulation}
                    onChange={(value) =>
                        dispatch({
                            type: 'solid floor/merge input',
                            payload: {
                                allOverInsulation: value,
                            },
                        })
                    }
                />
            </OptionalSection>
            <ChoiceSection
                value={state.edgeInsulation.selected ?? ('none' as const)}
                onChange={(value) =>
                    dispatch({
                        type: 'solid floor/merge input',
                        payload: {
                            edgeInsulation: { selected: value === 'none' ? null : value },
                        },
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
            <InsulationInput
                indent
                currentValue={state}
                onChange={(value) =>
                    dispatch({
                        type: 'solid floor/merge input',
                        payload: { edgeInsulation: { horizontal: value } },
                    })
                }
            />
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
                Width
            </LabelWithInfo>
            <NumericInput
                value={state.width === null ? null : state.width * 1000}
                callback={(value) =>
                    dispatch({
                        type: 'solid floor/merge input',
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
            <InsulationInput
                indent
                currentValue={state}
                onChange={(value) =>
                    dispatch({
                        type: 'solid floor/merge input',
                        payload: { edgeInsulation: { vertical: value } },
                    })
                }
            />
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
                Depth
            </LabelWithInfo>
            <NumericInput
                id={depthId}
                value={state.depth === null ? null : state.depth * 1000}
                callback={(value) =>
                    dispatch({
                        type: 'solid floor/merge input',
                        payload: {
                            edgeInsulation: {
                                vertical: { depth: value === null ? null : value / 1000 },
                            },
                        },
                    })
                }
                unit="mm"
            />
        </>
    );
}
