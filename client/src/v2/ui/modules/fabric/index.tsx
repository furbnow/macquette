import { assertNever } from '../../../helpers/assert-never';
import type { UiModule } from '../../module-management/module-type';
import { Fabric } from './component';
import { extractUpdateAction } from './extractor';
import { mutateLegacyData } from './mutator';
import { reducer } from './reducer';
import type { Action } from './reducer';
import { initialState } from './state';
import type { State } from './state';

export const fabricModule: UiModule<State, Action, never> = {
    name: 'fabric',
    initialState,
    reducer,
    effector: assertNever,
    component: Fabric,
    shims: {
        mutateLegacyData,
        extractUpdateAction,
    },
};
