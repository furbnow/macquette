import { coalesceEmptyString } from '../../../data-schemas/scenario/value-schemas';
import { DeepPartial, safeMerge } from '../../../helpers/safe-merge';
import { calcMeasureQtyAndCost } from '../../../measures';
import { CompleteWallLike, CompleteWallMeasure } from '../../input-components/libraries';
import type { AppliedWallMeasure, State, WallLike } from './state';

export type Action =
    | {
          type: 'external data update';
          state: Partial<State>;
      }
    | {
          type: 'fabric/set thermal mass parameter';
          value: State['thermalMassParameter'];
      }
    | {
          type: 'fabric/show modal';
          value: State['modal'];
      }
    | {
          type: 'fabric/merge wall input';
          id: WallLike['id'];
          value: DeepPartial<WallLike['inputs']>;
      }
    | {
          type: 'fabric/add wall';
          item: CompleteWallLike;
      }
    | {
          type: 'fabric/delete wall';
          id: WallLike['id'];
      }
    | {
          type: 'fabric/replace wall';
          id: WallLike['id'];
          item: CompleteWallLike;
      }
    | {
          type: 'fabric/apply wall measures';
          ids: WallLike['id'][];
          item: CompleteWallMeasure;
      }
    | {
          type: 'fabric/revert wall measure';
          id: WallLike['id'];
      };

type WithMeasuresInput = Omit<AppliedWallMeasure, 'outputs'> & {
    outputs: Omit<AppliedWallMeasure['outputs'], 'costQuantity' | 'costTotal'>;
};

function withMeasuresQtyAndCost(wall: WithMeasuresInput): AppliedWallMeasure {
    const [costQuantity, costTotal] = calcMeasureQtyAndCost({
        area: wall.inputs.area[wall.inputs.area.type].area ?? 0,
        costUnits: wall.element.cost_units,
        costPerUnit: wall.element.cost,
        baseCost: wall.element.min_cost,
        isExternalWallInsulation: wall.element.EWI,
    });

    return {
        ...wall,
        outputs: {
            ...wall.outputs,
            costQuantity,
            costTotal,
        },
    };
}

/**
 * Remove a fabric element from a bulk measure.
 *
 * Note that we leave empty bulk measures in place because the mutator function deals
 * with removing them from the global state.  At some point this function should do that
 * itself.
 */
function removeFromBulkMeasure(state: State, ids: number[]) {
    for (const measure of state.bulkMeasures) {
        measure.appliesTo = measure.appliesTo.filter((id) =>
            ids.includes(id) ? false : true,
        );
    }
}

export function reducer(state: State, action: Action): [State] {
    switch (action.type) {
        case 'external data update': {
            return [
                {
                    ...state,
                    ...action.state,
                },
            ];
        }
        case 'fabric/set thermal mass parameter': {
            state.thermalMassParameter = action.value;
            return [state];
        }
        case 'fabric/merge wall input': {
            if (state.modal !== null) {
                state.justInserted = null;
            }
            state.walls = state.walls.map((wall) => {
                if (wall.id !== action.id) {
                    return wall;
                } else {
                    const result = {
                        ...wall,
                        inputs: safeMerge(wall.inputs, action.value),
                    };

                    const dimensions = result.inputs.area.dimensions;
                    if (dimensions.length !== null && dimensions.height !== null) {
                        dimensions.area = dimensions.length * dimensions.height;
                    } else {
                        dimensions.area = null;
                    }

                    if (result.type === 'measure') {
                        return withMeasuresQtyAndCost(result);
                    } else {
                        return result;
                    }
                }
            });
            return [state];
        }
        case 'fabric/add wall': {
            const toInsert: WallLike = {
                id: state.maxId + 1,
                type: 'element',
                inputs: {
                    location: '',
                    area: {
                        type: 'dimensions',
                        dimensions: { area: null, length: null, height: null },
                        specific: { area: null },
                    },
                },
                element: action.item,
                outputs: {
                    windowArea: null,
                    netArea: null,
                    heatLoss: null,
                },
                revertTo: null,
            };
            state.walls.push(toInsert);
            state.maxId += 1;
            state.justInserted = toInsert.id;
            state.modal = null;
            return [state];
        }
        case 'fabric/delete wall': {
            state.walls = state.walls.filter((wall) => wall.id !== action.id);
            state.deletedElement = action.id;
            removeFromBulkMeasure(state, [action.id]);
            return [state];
        }
        case 'fabric/show modal': {
            state.modal = action.value;
            if (state.modal !== null) {
                state.justInserted = null;
            }
            return [state];
        }
        case 'fabric/replace wall': {
            state.walls = state.walls.map((wall) =>
                wall.id === action.id && wall.type === 'element'
                    ? { ...wall, element: action.item }
                    : wall,
            );
            state.modal = null;
            return [state];
        }
        case 'fabric/apply wall measures': {
            state.walls = state.walls.map((wall) => {
                if (!action.ids.includes(wall.id)) {
                    return wall;
                } else {
                    return withMeasuresQtyAndCost({
                        ...wall,
                        type: 'measure',
                        element: {
                            ...action.item,
                            cost: coalesceEmptyString(action.item.cost, 0),
                        },
                    });
                }
            });

            // Remove any entries previously in bulk measures & create a new bulk
            // measure if required
            removeFromBulkMeasure(state, action.ids);
            if (action.ids.length > 1) {
                state.bulkMeasures.push({
                    id: state.maxId + 1,
                    appliesTo: action.ids,
                });
            }

            state.modal = null;

            return [state];
        }
        case 'fabric/revert wall measure': {
            const wall = state.walls.find((wall) => wall.id === action.id);
            if (wall === undefined) {
                throw new Error("Couldn't revert: bad ID");
            }

            const revertTo = wall.revertTo;
            if (revertTo === null) {
                throw new Error("Couldn't revert: nothing to revert to");
            }

            state.walls = state.walls.map((wall) =>
                wall.id !== action.id
                    ? wall
                    : {
                          ...wall,
                          type: 'element',
                          element: revertTo.element,
                          revertTo: null,
                      },
            );

            removeFromBulkMeasure(state, [action.id]);

            return [state];
        }
        default: {
            return [state];
        }
    }
}
