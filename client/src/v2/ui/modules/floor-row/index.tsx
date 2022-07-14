import { pick } from 'lodash';
import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';

import {
    FloorType,
    FloorUValueError,
    FloorUValueWarning,
    PerFloorTypeSpec,
} from '../../../data-schemas/scenario/fabric/floor-u-value';
import { coalesceEmptyString } from '../../../data-schemas/scenario/value-schemas';
import { Result } from '../../../helpers/result';
import { safeMerge } from '../../../helpers/safe-merge';
import { WithWarnings } from '../../../helpers/with-warnings';
import { NumericInput } from '../../input-components/numeric';
import { Select } from '../../input-components/select';
import { TextInput } from '../../input-components/text';
import { UiModule } from '../../module-management/module-type';
import { extractFloorElement, extractRawFloorElement } from './extract-floor-element';
import { FUVC } from './u-value-calculator/component';
import { floorTypeDisplay } from './u-value-calculator/shared-components/floor-type-display';
import * as fuvcState from './u-value-calculator/state';

type LoadedState = {
    // Read-only
    elementId: string;

    // Model outputs
    modelOutput: {
        uValue: WithWarnings<Result<number, FloorUValueError>, FloorUValueWarning>;
        elementLoss: number;
    };

    // Self-managed
    loaded: true;
    location: string;
    area: number;
    exposedPerimeter: number;
    selectedFloorType: FloorType;
    perFloorTypeSpec: PerFloorTypeSpec;
};

type LoadingState = {
    loaded: false;
    elementId: string;
};

type Action =
    | {
          type: 'external data update';
          floorSpec: {
              location: string;
              area: number;
              exposedPerimeter: number;
              selectedFloorType: FloorType;
              perFloorTypeSpec: PerFloorTypeSpec;
          };
          modelOutput: {
              uValue: WithWarnings<Result<number, FloorUValueError>, FloorUValueWarning>;
              elementLoss: number;
          };
      }
    | { type: 'set per-floor-type state'; perFloorTypeSpec: PerFloorTypeSpec }
    | { type: 'set custom u-value'; uValue: number }
    | {
          type: 'merge state';
          toMerge: Partial<
              Pick<
                  LoadedState,
                  'location' | 'area' | 'exposedPerimeter' | 'selectedFloorType'
              >
          >;
      };

export const floorRowModule: UiModule<LoadingState | LoadedState, Action> = {
    name: 'floor row',
    initialState: (instanceKey) => ({
        loaded: false,
        elementId: instanceKey,
    }),
    reducer: (state, action) => {
        switch (action.type) {
            case 'set per-floor-type state': {
                if (!state.loaded) return state;
                const newState = { ...state };
                newState.perFloorTypeSpec = action.perFloorTypeSpec;
                return newState;
            }
            case 'set custom u-value': {
                if (!state.loaded) return state;
                return {
                    ...state,
                    perFloorTypeSpec: {
                        ...state.perFloorTypeSpec,
                        custom: { uValue: action.uValue },
                    },
                };
            }
            case 'merge state':
                if (!state.loaded) return state;
                return safeMerge(state, action.toMerge);
            case 'external data update':
                return {
                    ...state,
                    ...pick(action.floorSpec, [
                        'location',
                        'area',
                        'exposedPerimeter',
                        'selectedFloorType',
                    ]),
                    modelOutput: action.modelOutput,
                    loaded: true,
                    perFloorTypeSpec: action.floorSpec.perFloorTypeSpec,
                };
        }
    },
    shims: {
        extractUpdateAction: ({ currentScenario }, instanceKey) => {
            const elementId = instanceKey;
            return extractFloorElement(currentScenario, elementId).chain((element) => {
                let selectedFloorType: FloorType;
                let perFloorTypeSpec: PerFloorTypeSpec;
                if (
                    element.perFloorTypeSpec === undefined ||
                    element.selectedFloorType === undefined
                ) {
                    perFloorTypeSpec = fuvcState.initialPerFloorTypeSpec();
                    selectedFloorType = 'custom';
                    perFloorTypeSpec.custom.uValue = coalesceEmptyString(
                        element.uvalue,
                        null,
                    );
                } else {
                    perFloorTypeSpec = element.perFloorTypeSpec;
                    selectedFloorType = element.selectedFloorType;
                }
                const { uValueModelOutput } = element;
                if (uValueModelOutput === undefined) {
                    return Result.err(
                        new Error(
                            'Expected uValueModelOutput to be defined. Perhaps the model has not run?',
                        ),
                    );
                }
                const action: Action = {
                    type: 'external data update',
                    floorSpec: {
                        location: element.location ?? '',
                        area: coalesceEmptyString(element.area, 0),
                        exposedPerimeter:
                            coalesceEmptyString(element.perimeter, null) ?? 0,
                        selectedFloorType,
                        perFloorTypeSpec,
                    },
                    modelOutput: {
                        elementLoss: coalesceEmptyString(element.wk, undefined) ?? 0,
                        uValue: uValueModelOutput,
                    },
                };
                return Result.ok(action);
            });
        },
        mutateLegacyData: (externals, state, instanceKey) => {
            if (!state.loaded) return;
            const elementId = instanceKey;
            const element = extractRawFloorElement(externals, elementId);
            element.location = state.location;
            element.area = state.area;
            element.perimeter = state.exposedPerimeter;
            element.selectedFloorType = state.selectedFloorType;
            element.perFloorTypeSpec = state.perFloorTypeSpec;
        },
    },
    component: function FloorRow({ state, dispatch }) {
        const calculatorRowContent = state.loaded &&
            state.selectedFloorType !== 'custom' && (
                <>
                    <td></td>
                    <td colSpan={7}>
                        <FUVC
                            value={state.perFloorTypeSpec}
                            onChange={(perFloorTypeSpec) => {
                                dispatch({
                                    type: 'set per-floor-type state',
                                    perFloorTypeSpec,
                                });
                            }}
                            elementId={''}
                            modelUValueOutput={state.modelOutput.uValue}
                            selectedFloorType={state.selectedFloorType}
                        />
                    </td>
                </>
            );
        const calculatorRowElement = useMemo(() => {
            const element = document.querySelector(
                `.react-fuvc-row[data-element-id="${state.elementId}"`,
            );
            if (element === null) {
                throw new Error(`Could not find FUVC row for element ${state.elementId}`);
            }
            return element;
        }, [state.elementId]);
        const portal = createPortal(calculatorRowContent, calculatorRowElement);
        if (!state.loaded) {
            return <>Loading...</>;
        }
        return (
            <>
                {portal}
                <td></td>
                <td>
                    <TextInput
                        value={state.location}
                        onChange={(location) =>
                            dispatch({
                                type: 'merge state',
                                toMerge: { location },
                            })
                        }
                        style={{ width: '15rem' }}
                    />
                </td>
                <td>
                    <Select
                        className="input--auto-width"
                        selected={state.selectedFloorType}
                        callback={(selectedFloorType) => {
                            dispatch({
                                type: 'merge state',
                                toMerge: {
                                    selectedFloorType,
                                },
                            });
                        }}
                        options={(
                            [
                                'solid',
                                'suspended',
                                'exposed',
                                'heated basement',
                                'custom',
                            ] as const
                        ).map((floorType: FloorType) => ({
                            value: floorType,
                            display: floorTypeDisplay(floorType),
                        }))}
                    />
                </td>
                <td>
                    {state.selectedFloorType === 'custom' ? (
                        <NumericInput
                            value={state.perFloorTypeSpec.custom.uValue}
                            callback={(value) =>
                                dispatch({
                                    type: 'set custom u-value',
                                    uValue: value ?? 0,
                                })
                            }
                            unit="W/K.m²"
                        />
                    ) : (
                        state.modelOutput.uValue
                            .inner()[0]
                            .map((value) => <>{value.toFixed(2)} W/K.m²</>)
                            .mapErr(() => <>[error]</>)
                            .coalesce()
                    )}
                </td>
                <td>
                    <NumericInput
                        value={state.exposedPerimeter}
                        callback={(exposedPerimeter) =>
                            dispatch({
                                type: 'merge state',
                                toMerge: { exposedPerimeter: exposedPerimeter ?? 0 },
                            })
                        }
                        unit="m"
                    />
                </td>
                <td>
                    <NumericInput
                        value={state.area}
                        callback={(area) =>
                            dispatch({
                                type: 'merge state',
                                toMerge: { area: area ?? 0 },
                            })
                        }
                        unit="m²"
                    />
                </td>
                <td>{state.modelOutput.elementLoss.toFixed(2)} W/K</td>
            </>
        );
    },
};
