import { cloneDeep } from 'lodash';
import React from 'react';

import { FloorLayerSpec } from '../../../../../data-schemas/scenario/fabric/floor-u-value';
import { isNonEmpty, NonEmptyArray } from '../../../../../helpers/non-empty-array';
import { Proportion } from '../../../../../helpers/proportion';
import { safeMerge } from '../../../../../helpers/safe-merge';
import { partialBem } from '../../../../bem';
import { InfoTooltip } from '../../../../input-components/forms';
import { NumberInput } from '../../../../input-components/number';
import { MaterialSelector } from './material-selector';

type Layers = NonEmptyArray<FloorLayerSpec>;
type Props = {
    layers: Layers;
    onChange: (layers: Layers) => void;
};

type AddLayer = { type: 'add layer' };
type DeleteLayer = { type: 'delete layer'; layerIndex: number };
type MergeLayerState = {
    type: 'merge layer state';
    layerIndex: number;
    payload: Partial<Omit<FloorLayerSpec, 'bridging'>> & {
        bridging?: Partial<FloorLayerSpec['bridging']>;
    };
};
type Action = AddLayer | DeleteLayer | MergeLayerState;
function reducer(layers: Layers, action: Action): Layers {
    const newLayers = cloneDeep(layers);
    switch (action.type) {
        case 'add layer': {
            newLayers.push({
                thickness: null,
                mainMaterial: null,
                bridging: {
                    material: null,
                    proportion: null,
                },
            });
            return newLayers;
        }
        case 'delete layer': {
            newLayers.splice(action.layerIndex, 1);
            if (isNonEmpty(newLayers)) {
                return newLayers;
            } else {
                return layers;
            }
        }
        case 'merge layer state': {
            const layer = newLayers[action.layerIndex];
            if (layer === undefined) {
                return newLayers;
            }
            newLayers[action.layerIndex] = safeMerge(layer, action.payload);
            return newLayers;
        }
    }
}

const combinedMethodBem = partialBem('combined-method-input');

export function CombinedMethod({ layers, onChange }: Props) {
    function dispatch(action: Action) {
        return onChange(reducer(layers, action));
    }
    return (
        <div className={combinedMethodBem('root')}>
            <table className={combinedMethodBem('table')}>
                <thead>
                    <tr className={combinedMethodBem('heading-row')}>
                        <th className={combinedMethodBem('layer-id-heading-cell')}>
                            Layer
                        </th>
                        <th className={combinedMethodBem('thickness-heading-cell')}>
                            Thickness
                        </th>
                        <th className={combinedMethodBem('main-material-heading-cell')}>
                            Main material
                        </th>
                        <th
                            className={combinedMethodBem(
                                'bridging-material-heading-cell',
                            )}
                        >
                            Bridging material
                        </th>
                        <th
                            className={combinedMethodBem(
                                'bridging-proportion-heading-cell',
                            )}
                        >
                            Bridging proportion
                            <InfoTooltip>
                                <p>
                                    The bridging portion of a suspended ground floor or
                                    exposed upper floor is made up of the timber structure
                                    that passes through the insulation layer. The amount
                                    of bridging can vary significantly, and sometimes
                                    timbers are added to deal with structural problems or
                                    accommodate alterations and hatches, increasing the
                                    amount of bridging.
                                </p>
                                <p>
                                    In a standard floor with 70mm wide joists at 600mm
                                    centres it can be assumed to be around 12%, or
                                    approximately 16% in a timber floor with 70mm joists
                                    at 450mm centres. You find this percentage by dividing
                                    the width of the joist (usually 75-100mm) by the
                                    distance between centres (usually 450-600mm). If this
                                    is unknown because you cannot access the floor
                                    structure, then assume 600mm centres and 75mm joists.
                                </p>
                            </InfoTooltip>
                        </th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {layers.map((layer, index) => (
                        <Layer
                            layer={layer}
                            dispatch={dispatch}
                            key={index}
                            index={index}
                        />
                    ))}
                    <tr
                        className={combinedMethodBem(
                            'layer-row',
                            layers.length % 2 === 1 ? 'stripe' : null,
                        )}
                    >
                        <td className={combinedMethodBem('layer-id-cell')}>
                            <button
                                className="btn"
                                onClick={() =>
                                    dispatch({
                                        type: 'add layer',
                                    })
                                }
                            >
                                +
                            </button>
                        </td>
                        <td colSpan={5}></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

type LayerProps = {
    layer: FloorLayerSpec;
    dispatch: (action: Action) => void;
    index: number;
};
function Layer({ layer, dispatch, index }: LayerProps) {
    const { thickness, mainMaterial, bridging } = layer;
    return (
        <tr className={combinedMethodBem('layer-row', index % 2 === 1 ? 'stripe' : null)}>
            <td className={combinedMethodBem('layer-id-cell')}>
                {(index + 1).toString(10)}
            </td>
            <td>
                <NumberInput
                    value={thickness !== null ? thickness * 1000 : null}
                    unit="mm"
                    callback={(value) =>
                        dispatch({
                            type: 'merge layer state',
                            layerIndex: index,
                            payload: { thickness: value === null ? null : value / 1000 },
                        })
                    }
                />
            </td>
            <td>
                <MaterialSelector
                    value={mainMaterial}
                    onChange={(value) =>
                        dispatch({
                            type: 'merge layer state',
                            layerIndex: index,
                            payload: { mainMaterial: value },
                        })
                    }
                />
            </td>
            <td>
                <MaterialSelector
                    value={bridging.material}
                    onChange={(value) =>
                        dispatch({
                            type: 'merge layer state',
                            layerIndex: index,
                            payload: { bridging: { material: value } },
                        })
                    }
                    optional
                />
            </td>
            <td>
                <NumberInput
                    value={bridging.proportion?.asPercent ?? null}
                    disabled={bridging.material === null}
                    unit="%"
                    callback={(value) =>
                        dispatch({
                            type: 'merge layer state',
                            layerIndex: index,
                            payload: {
                                bridging: {
                                    proportion:
                                        value === null
                                            ? null
                                            : Proportion.fromPercentClamped(value),
                                },
                            },
                        })
                    }
                />
            </td>
            <td>
                <button
                    className="btn"
                    style={index === 0 ? { visibility: 'hidden' } : {}}
                    onClick={() =>
                        dispatch({
                            type: 'delete layer',
                            layerIndex: index,
                        })
                    }
                >
                    Delete
                </button>
            </td>
        </tr>
    );
}

export type ExportsForTest = {
    layers: Layers;
};
export const exportsForTest = {
    reducer,
};
