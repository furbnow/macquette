import { HTTPClient } from '../api/http';
import { isIndexable } from '../helpers/is-indexable';

/* eslint-disable
    @typescript-eslint/consistent-type-assertions,
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-unsafe-member-access,
*/
export function externals() {
    const update: unknown = (window as any).update;
    if (typeof update !== 'function') {
        throw new Error('window.update was not a function');
    }
    const project: unknown = (window as any).p;
    if (!isIndexable(project)) {
        throw new Error('window.p is not a Record');
    }
    return {
        project,
        scenarioId: (window as any).scenario as unknown,
        update,

        // SAFETY: window.libraries is set in the legacy library helper from
        // this API function.
        libraries: (window as any).libraries as
            | (ReturnType<HTTPClient['listLibraries']> extends Promise<infer T>
                  ? T
                  : unknown)
            | undefined,
    };
}

export type Externals = ReturnType<typeof externals>;
