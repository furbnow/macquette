import { cloneDeep, isEqual, omit } from 'lodash';
import { ZodError, z } from 'zod';
import { HTTPClient } from '../api/http';
import { resultSchema } from '../data-schemas/helpers/result';
import { projectSchema } from '../data-schemas/project';
import { isIndexable } from '../helpers/is-indexable';
import { CombinedModules } from '../model/combined-modules';
import { ModelError } from '../model/error';
import { AppContext } from '../ui/module-management/module-type';
import { DEFAULT_ROUTE, Route, parseRoute } from '../ui/routes';

/* eslint-disable
    @typescript-eslint/consistent-type-assertions,
*/
export function externals() {
  if (!isIndexable(window)) {
    throw new Error('not running in browser');
  }
  const update: unknown = window['update'];
  if (typeof update !== 'function') {
    throw new Error('window.update was not a function');
  }
  const project: unknown = window['p'];
  if (!isIndexable(project)) {
    throw new Error('window.p is not a Record');
  }
  const appName: unknown = window['appName'];
  if (typeof appName !== 'string') {
    throw new Error('window.appName is not a string');
  }
  const userId: unknown = window['userId'];
  if (typeof userId !== 'string') {
    throw new Error('window.userId is not a string');
  }
  return {
    project,
    update,
    appName,
    userId,

    // SAFETY: window.libraries is set in the legacy library helper from
    // this API function.
    libraries: window['libraries'] as
      | (ReturnType<HTTPClient['listLibraries']> extends Promise<infer T> ? T : unknown)
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

  const { appName, userId } = externals();

  return {
    route,
    project,
    scenarioId,
    currentScenario,
    currentModel,
    appName,
    userId,
  };
}

export function applyDataMutator(
  mutator: (toMutate: Pick<Externals, 'project'>, context: AppContext) => void,
  source: { moduleName: string; instanceKey: string | null },
) {
  const origProject = cloneDeep(externals().project);
  mutator(externals(), getAppContext());

  const origMetadata = omit(origProject, 'data');
  const newMetadata = omit(externals().project, 'data');

  if (!isEqual(origProject['data'], externals().project['data'])) {
    externals().update({ dataChanged: true, source });
  } else if (!isEqual(origMetadata, newMetadata)) {
    externals().update({ dataChanged: false, source });
  }
}
