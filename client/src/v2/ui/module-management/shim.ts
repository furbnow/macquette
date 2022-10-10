import { cloneDeep, isEqual } from 'lodash';
import { createElement } from 'react';
import { createRoot, Root as ReactRoot } from 'react-dom/client';
import { z } from 'zod';

import { Project, projectSchema } from '../../data-schemas/project';
import { Scenario } from '../../data-schemas/scenario';
import { Result } from '../../helpers/result';
import { CombinedModules } from '../../model/combined-modules';
import { externals } from '../../shims/typed-globals';
import type { UiModule } from './module-type';

export type LegacyContext = {
    project: Project;
    scenarioId: string;
    currentScenario: Scenario;
    currentModel: CombinedModules;
};

export class UiModuleShim<State, Action, Effect> {
    private keyedInstances: Record<string, { root: ReactRoot; state: State }> = {};

    constructor(private module_: UiModule<State, Action, Effect>) {}

    private getInstance(
        instanceKey: string,
    ): Result<{ root: ReactRoot; state: State }, string> {
        const instance = this.keyedInstances[instanceKey];
        if (instance === undefined) {
            return Result.err(`module not found: ${instanceKey}`);
        }
        return Result.ok(instance);
    }

    init(element: Element, instanceKey: string) {
        this.keyedInstances[instanceKey] = {
            root: createRoot(element),
            state: this.module_.initialState(instanceKey),
        };
        this.render(instanceKey);
    }

    unmount(instanceKey: string) {
        const { root } = this.getInstance(instanceKey).unwrap();
        root.unmount();
        delete this.keyedInstances[instanceKey];
    }

    unmountAll() {
        for (const instanceKey of Object.keys(this.keyedInstances)) {
            this.unmount(instanceKey);
        }
    }

    update() {
        const project = projectSchema.parse(externals().project);
        const scenarioId = z.string().parse(externals().scenarioId);
        const currentScenario = project.data[scenarioId];
        if (currentScenario === undefined) {
            throw new Error('Current scenario not found in project');
        }
        const currentModel = currentScenario.model;
        if (!(currentModel instanceof CombinedModules)) {
            throw new Error(
                'Current scenario model key was not an instance of CombinedModules',
            );
        }
        for (const instanceKey of Object.keys(this.keyedInstances)) {
            const legacyContext: LegacyContext = {
                project,
                scenarioId,
                currentScenario,
                currentModel,
            };
            const actionR = this.module_.shims.extractUpdateAction(
                legacyContext,
                instanceKey,
            );
            if (!actionR.isOk()) {
                console.error(actionR.coalesce());
                continue;
            }
            const action = actionR.coalesce();
            this.dispatch(action, instanceKey, false);
        }
    }

    private reduceModuleInstance(action: Action, instanceKey: string) {
        const instance = this.getInstance(instanceKey).unwrap();
        const result = this.module_.reducer(instance.state, action);

        const [state, effects = []] = result;
        instance.state = state;

        for (const effect of effects) {
            this.module_
                .effector(effect, (action) => this.dispatch(action, instanceKey, true))
                .catch((err) => console.error(err));
        }
    }

    private render(instanceKey: string) {
        const { root, state } = this.getInstance(instanceKey).unwrap();
        root.render(
            createElement(this.module_.component, {
                state,
                dispatch: (action) => this.dispatch(action, instanceKey, true),
            }),
        );
    }

    private dispatch(action: Action, instanceKey: string, internal: boolean) {
        this.reduceModuleInstance(action, instanceKey);
        this.render(instanceKey);
        if (internal) {
            const { state } = this.getInstance(instanceKey).unwrap();
            const origProject = cloneDeep(externals().project);
            this.module_.shims.mutateLegacyData(externals(), state, instanceKey);
            if (!isEqual(origProject, externals().project)) {
                externals().update();
            }
        }
    }
}
