import React from 'react';

import { assertNever } from '../../helpers/assert-never';
import { Result } from '../../helpers/result';
import type { UiModule } from '../module-management/module-type';
import type { GraphicsInput } from '../output-components/graphics';
import { Graphics, getGraphicsInput } from '../output-components/graphics';
import { LockedWarning } from '../output-components/locked-warning';
import type { ScenarioPageName, StandalonePageName } from '../pages';
import { pageTitles } from '../pages';

export type State = {
    currentPage: StandalonePageName | ScenarioPageName | null;
    isScenarioPage: boolean;
    houseGraphicShown: boolean;
    scenarioId: string;
    scenarioLocked: boolean;
    graphicsInput: GraphicsInput | null;
};
export type Action = { type: 'update state'; state: Partial<State> };

export const editorHeaderModule: UiModule<State, Action, never> = {
    name: 'editorHeader',
    component: function EditorHeader({ state, dispatch }) {
        let scenarioName = null;
        if (state.isScenarioPage) {
            if (state.scenarioId === 'master') {
                scenarioName = 'Baseline';
            } else {
                scenarioName =
                    state.scenarioId.charAt(0).toUpperCase() +
                    state.scenarioId.slice(1, -1) +
                    ' ' +
                    state.scenarioId.slice(-1);
            }
        }

        return (
            <>
                <div className="d-flex justify-content-between align-items-center mb-30">
                    <h2 className="ma-0">
                        {scenarioName !== null && (
                            <>
                                {scenarioName}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                    className="mx-7"
                                    viewBox="0 0 16 16"
                                >
                                    <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z" />
                                </svg>
                            </>
                        )}
                        {state.currentPage === null
                            ? ''
                            : pageTitles[state.currentPage] ?? ''}
                    </h2>

                    {state.isScenarioPage && (
                        <button
                            onClick={() =>
                                dispatch({
                                    type: 'update state',
                                    state: {
                                        houseGraphicShown: !state.houseGraphicShown,
                                    },
                                })
                            }
                            className="btn"
                        >
                            {state.houseGraphicShown ? 'Hide' : 'Show'} graphics
                        </button>
                    )}
                </div>

                <LockedWarning locked={state.scenarioLocked} />

                {state.houseGraphicShown &&
                    state.isScenarioPage &&
                    state.graphicsInput !== null && (
                        <Graphics input={state.graphicsInput} />
                    )}
            </>
        );
    },
    initialState: () => {
        return {
            currentPage: null,
            isScenarioPage: false,
            scenarioId: '',
            scenarioLocked: false,
            measuresCost: null,
            graphicsInput: null,
            houseGraphicShown: true,
        };
    },
    reducer: (state, action) => {
        switch (action.type) {
            case 'update state':
                return [{ ...state, ...action.state }];
        }
    },
    effector: assertNever,
    shims: {
        extractUpdateAction: function ({ currentScenario, scenarioId, route }) {
            return Result.ok<Action[]>([
                {
                    type: 'update state',
                    state: {
                        currentPage: route.page,
                        isScenarioPage: route.type === 'with scenario',
                        scenarioId: scenarioId ?? '',
                        scenarioLocked:
                            route.type === 'with scenario' &&
                            (currentScenario?.locked ?? false),
                        graphicsInput: getGraphicsInput(
                            scenarioId ?? '',
                            currentScenario,
                        ),
                    },
                },
            ]);
        },
        mutateLegacyData: () => undefined,
    },
};
