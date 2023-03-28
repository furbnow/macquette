import { cloneDeep, isEqual } from 'lodash';
import { z, ZodError } from 'zod';
import { HTTPClient } from '../api/http';
import { resultSchema } from '../data-schemas/helpers/result';
import { projectSchema } from '../data-schemas/project';
import { isIndexable } from '../helpers/is-indexable';
import { CombinedModules } from '../model/combined-modules';
import { ModelError } from '../model/error';
import { AppContext } from '../ui/module-management/module-type';
import { DEFAULT_ROUTE, parseRoute, Route } from '../ui/routes';

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

export function getCurrentRoute(): Route {
    return (
        parseRoute(window.location.hash)
            .mapErr((e) => {
                console.warn(e);
                return DEFAULT_ROUTE;
            })
            .coalesce() ?? DEFAULT_ROUTE
    );
}

/** Inspect various pieces of global state and return them bundled up */
export function getAppContext(): AppContext {
    const route = getCurrentRoute();
    const scenarioId = route.type === 'with scenario' ? route.scenarioId : null;
    const project = projectSchema.parse(externals().project);
    const currentScenario =
        scenarioId === null ? project.data['master'] : project.data[scenarioId];
    if (currentScenario === undefined) {
        throw new Error('Current scenario not found in project');
    }
    // We parse this here rather than in the scenario schema because:
    // 1. It would cause cyclical imports
    // 2. If currentScenario.model doesn't fit this shape (which could happen due
    //    due to an unexpected error), we still need to be able to run the model.
    const currentModel = resultSchema(
        z.instanceof(CombinedModules),
        z.union([z.instanceof(ModelError), z.instanceof(ZodError)]),
    ).parse(currentScenario.model);

    return {
        route,
        project,
        scenarioId,
        currentScenario,
        currentModel,
    };
}

export function applyDataMutator(
    mutator: (toMutate: Pick<Externals, 'project'>, context: AppContext) => void,
) {
    const origProject = cloneDeep(externals().project);
    mutator(externals(), getAppContext());
    if (!isEqual(origProject, externals().project)) {
        externals().update();
    }
}
