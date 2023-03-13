import { pick } from 'lodash';
import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';

import {
    FloorType,
    PerFloorTypeSpec,
} from '../../../data-schemas/scenario/fabric/floor-u-value';
import { coalesceEmptyString } from '../../../data-schemas/scenario/value-schemas';
import { assertNever } from '../../../helpers/assert-never';
import { Result } from '../../../helpers/result';
import { safeMerge } from '../../../helpers/safe-merge';
import { Floor } from '../../../model/modules/fabric/element-types';
import { InfoTooltip } from '../../input-components/forms';
import { NumberInput } from '../../input-components/number';
import { Select } from '../../input-components/select';
import { TextInput } from '../../input-components/text';
import { UiModule } from '../../module-management/module-type';
import {
    extractFloorDataElement,
    extractFloorModelElement,
    extractRawFloorElement,
} from './extract-floor-element';
import { FUVC } from './u-value-calculator/component';
import { floorTypeDisplay } from './u-value-calculator/shared-components/floor-type-display';
import * as fuvcState from './u-value-calculator/state';

type LoadedState = {
    // Read-only
    elementId: string;

    // Self-managed
    loaded: true;
    location: string;
    area: number;
    exposedPerimeter: number;
    selectedFloorType: FloorType;
    perFloorTypeSpec: PerFloorTypeSpec;
    showLegacySolidFloorOption: boolean;
    modelElement: Floor | null;
    scenarioIsBaseline: boolean;
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
          modelElement: Floor | null;
          scenarioIsBaseline: boolean;
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

export const floorRowModule: UiModule<LoadingState | LoadedState, Action, never> = {
    name: 'floor row',
    initialState: (instanceKey) => ({
        loaded: false,
        elementId: instanceKey,
    }),
    reducer: (state, action) => {
        switch (action.type) {
            case 'set per-floor-type state': {
                if (!state.loaded) return [state];
                const newState = { ...state };
                newState.perFloorTypeSpec = action.perFloorTypeSpec;
                return [newState];
            }
            case 'set custom u-value': {
                if (!state.loaded) return [state];
                return [
                    {
                        ...state,
                        perFloorTypeSpec: {
                            ...state.perFloorTypeSpec,
                            custom: { uValue: action.uValue },
                        },
                    },
                ];
            }
            case 'merge state':
                if (!state.loaded) return [state];
                return [safeMerge(state, action.toMerge)];
            case 'external data update': {
                // If solid floor has ever been selected, keep showing it
                const showLegacySolidFloorOption =
                    (state.loaded && state.showLegacySolidFloorOption) ||
                    action.floorSpec.selectedFloorType === 'solid';
                const newState: LoadedState = {
                    ...state,
                    ...pick(action.floorSpec, [
                        'location',
                        'area',
                        'exposedPerimeter',
                        'selectedFloorType',
                    ]),
                    loaded: true,
                    perFloorTypeSpec: action.floorSpec.perFloorTypeSpec,
                    showLegacySolidFloorOption,
                    modelElement: action.modelElement,
                    scenarioIsBaseline: action.scenarioIsBaseline,
                };
                return [newState];
            }
        }
    },
    effector: assertNever,
    shims: {
        extractUpdateAction: (
            { currentScenario, scenarioId, currentModel },
            instanceKey,
        ) => {
            const elementId = instanceKey;
            const dataElementR = extractFloorDataElement(currentScenario, elementId);
            if (dataElementR.isErr()) {
                return dataElementR;
            }
            const dataElement = dataElementR.unwrap();
            const modelElement = currentModel
                .chain((model) => extractFloorModelElement(model, elementId))
                .mapErr(() => null) // Discard errors
                .coalesce();

            let selectedFloorType: FloorType;
            let perFloorTypeSpec: PerFloorTypeSpec;
            if (
                dataElement.perFloorTypeSpec === undefined ||
                dataElement.selectedFloorType === undefined
            ) {
                perFloorTypeSpec = fuvcState.initialPerFloorTypeSpec;
                selectedFloorType = 'custom';
                perFloorTypeSpec.custom.uValue = coalesceEmptyString(
                    dataElement.uvalue,
                    null,
                );
            } else {
                perFloorTypeSpec = dataElement.perFloorTypeSpec;
                selectedFloorType = dataElement.selectedFloorType;
            }
            const action: Action = {
                type: 'external data update',
                floorSpec: {
                    location: dataElement.location ?? '',
                    area: coalesceEmptyString(dataElement.area, 0),
                    exposedPerimeter:
                        coalesceEmptyString(dataElement.perimeter, null) ?? 0,
                    selectedFloorType,
                    perFloorTypeSpec,
                },
                modelElement: modelElement,
                scenarioIsBaseline: scenarioId === 'master',
            };
            return Result.ok(action);
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
                            modelElement={state.modelElement}
                            selectedFloorType={state.selectedFloorType}
                            suppressNonFiniteNumberErrors={
                                // Hack: sometimes an assessor will want to remove an element in a
                                // non-baseline scenario (e.g., to model replacing a floor). We do
                                // not yet support this, so as a workaround we tell them to set the
                                // area to 0. Therefore we must suppress non-finite number warnings
                                // in non-baseline scenarios where the area is set to 0.
                                !state.scenarioIsBaseline && state.area === 0
                            }
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
        const exposedPerimeterEnabled = ['solid (bs13370)', 'heated basement'].includes(
            state.selectedFloorType,
        );
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
                        value={state.selectedFloorType}
                        onChange={(selectedFloorType) => {
                            dispatch({
                                type: 'merge state',
                                toMerge: {
                                    selectedFloorType,
                                },
                            });
                        }}
                        options={(
                            [
                                'solid (bs13370)',
                                ...(state.showLegacySolidFloorOption
                                    ? ['solid' as const]
                                    : []),
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
                        <NumberInput
                            value={state.perFloorTypeSpec.custom.uValue}
                            onChange={(value) =>
                                dispatch({
                                    type: 'set custom u-value',
                                    uValue: value ?? 0,
                                })
                            }
                            unit="W/K.m²"
                        />
                    ) : (
                        <>{state.modelElement?.uValue.toFixed(2) ?? '[error]'} W/K.m²</>
                    )}
                </td>
                <td>
                    <NumberInput
                        disabled={!exposedPerimeterEnabled}
                        value={exposedPerimeterEnabled ? state.exposedPerimeter : null}
                        onChange={(exposedPerimeter) =>
                            dispatch({
                                type: 'merge state',
                                toMerge: { exposedPerimeter: exposedPerimeter ?? 0 },
                            })
                        }
                        unit="m"
                    />
                    <InfoTooltip>
                        This field is only enabled when the exposed perimeter value is
                        necessary for calculating the floor U-value; if it is disabled
                        then the exposed perimeter is not required.
                    </InfoTooltip>
                </td>
                <td>
                    <NumberInput
                        value={state.area}
                        onChange={(area) =>
                            dispatch({
                                type: 'merge state',
                                toMerge: { area: area ?? 0 },
                            })
                        }
                        unit="m²"
                    />
                </td>
                <td>{state.modelElement?.heatLoss.toFixed(2) ?? '[error]'} W/K</td>
            </>
        );
    },
};
