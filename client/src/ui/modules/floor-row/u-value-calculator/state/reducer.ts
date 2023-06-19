import { cloneDeep, omit } from 'lodash';

import type {
    FloorType,
    PerFloorTypeSpec,
} from '../../../../../data-schemas/scenario/fabric/floor-u-value';
import * as exposedFloor from '../floor-types/exposed';
import * as heatedBasementFloor from '../floor-types/heated-basement';
import * as solidFloor from '../floor-types/solid-bs13370';
import * as suspendedFloor from '../floor-types/suspended';

export type Action =
    | solidFloor.Action
    | heatedBasementFloor.Action
    | suspendedFloor.Action
    | exposedFloor.Action;

export function reducer(
    state: PerFloorTypeSpec & { selectedFloorType: FloorType },
    action: Action,
): PerFloorTypeSpec {
    const newState = cloneDeep(state);
    newState['solid (bs13370)'] = solidFloor.reducer(newState['solid (bs13370)'], action);
    newState['heated basement'] = heatedBasementFloor.reducer(
        newState['heated basement'],
        action,
    );
    newState.exposed = exposedFloor.reducer(newState.exposed, action);
    newState.suspended = suspendedFloor.reducer(newState.suspended, action);
    return omit(newState, 'selectedFloorType');
}
