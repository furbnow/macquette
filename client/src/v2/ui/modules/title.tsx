import React, { useEffect } from 'react';

import { assertNever } from '../../helpers/assert-never';
import { Result } from '../../helpers/result';
import type { UiModule } from '../module-management/module-type';
import { pageTitles } from '../pages';
import { Route } from '../routes';

export type State =
    | 'loading'
    | {
          appName: string;
          assessmentName: string;
          route: Route;
          currentScenarioName: string | null;
      };

export type Action = { type: 'external data update'; newState: State };

export const titleModule: UiModule<State, Action, never> = {
    name: 'title',
    component: function Title({ state }) {
        let title: string | null;
        if (state === 'loading') {
            title = null;
        } else {
            const pageDisplayName = pageTitles[state.route.page];
            if (
                state.route.type === 'with scenario' &&
                state.currentScenarioName !== null
            ) {
                title = `${pageDisplayName} - ${state.currentScenarioName} - ${state.assessmentName} | ${state.appName}`;
            } else {
                title = `${pageDisplayName} - ${state.assessmentName} | ${state.appName}`;
            }
        }
        useEffect(() => {
            if (title !== null) {
                document.title = title;
            }
        }, [title]);
        return <></>;
    },
    initialState: () => {
        return 'loading';
    },
    reducer: (_state, action) => {
        switch (action.type) {
            case 'external data update':
                return [action.newState];
        }
    },
    effector: assertNever,
    shims: {
        extractUpdateAction: (context) => {
            const { route, appName, currentScenario, project } = context;
            const assessmentName = project.name;
            const currentScenarioName = currentScenario?.scenario_name ?? null;
            return Result.ok({
                type: 'external data update',
                newState: {
                    route,
                    appName,
                    currentScenarioName,
                    assessmentName,
                },
            });
        },
        mutateLegacyData: () => undefined,
    },
};
