import { cloneDeep } from 'lodash';
import React from 'react';

import { FloorLayerSpec } from '../../../../../data-schemas/scenario/fabric/floor-u-value';
import { isNonEmpty, NonEmptyArray } from '../../../../../helpers/non-empty-array';
import { Proportion } from '../../../../../helpers/proportion';
import { safeMerge } from '../../../../../helpers/safe-merge';
import { partialBem } from '../../../../bem';
import { NumericInput } from '../../../../input-components/numeric';
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
    const { thickness } = layer;
    return (
        <tr className={combinedMethodBem('layer-row', index % 2 === 1 ? 'stripe' : null)}>
            <td className={combinedMethodBem('layer-id-cell')}>
                {(index + 1).toString(10)}
            </td>
            <td>
                <NumericInput
                    value={thickness === null ? null : thickness * 1000}
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
                    value={layer.mainMaterial}
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
                    value={layer.bridging.material}
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
                <NumericInput
                    value={layer.bridging.proportion?.asPercent ?? null}
                    disabled={layer.bridging.material === null}
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
