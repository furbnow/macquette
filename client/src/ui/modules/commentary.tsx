import React from 'react';
import { z } from 'zod';
import { projectSchema } from '../../data-schemas/project';

import { assertNever } from '../../helpers/assert-never';
import { Result } from '../../helpers/result';
import type { DeepPartial } from '../../helpers/safe-merge';
import { safeMerge } from '../../helpers/safe-merge';
import { TextInput } from '../input-components/text';
import { Textarea } from '../input-components/textarea';
import type { Dispatcher, UiModule } from '../module-management/module-type';

type State = {
    brief: string;
    context: string;
    decisions: string;
    scenarios: Record<
        string,
        {
            number: number;
            name: string;
            description: string;
        }
    >;
};

type Action =
    | { type: 'update state'; state: DeepPartial<State> }
    | { type: 'external data update'; state: State };

function Commentary({ state, dispatch }: { state: State; dispatch: Dispatcher<Action> }) {
    return (
        <section>
            <div className="mb-30">
                <label htmlFor="brief">
                    <b>Initial project brief and scope</b>:
                </label>
                <Textarea
                    id="brief"
                    rows={6}
                    style={{ width: '38rem' }}
                    value={state.brief}
                    onChange={(val) =>
                        dispatch({ type: 'update state', state: { brief: val } })
                    }
                />
                <p className="text-italic">
                    You should note here your understanding of the project brief and
                    scope.
                    <br />
                    It should include aims and priorities - how big the project is, etc.
                </p>
            </div>

            <div className="mb-30">
                <label htmlFor="context">
                    <b>Current context + logic of scenarios</b>:
                </label>

                <Textarea
                    id="context"
                    rows={6}
                    style={{ width: '38rem' }}
                    value={state.context}
                    onChange={(val) =>
                        dispatch({ type: 'update state', state: { context: val } })
                    }
                />
            </div>

            {Object.entries(state.scenarios).map(
                ([id, { name, number, description }]) => (
                    <section key={`commentary_${id}`} className="mb-30">
                        <label htmlFor={`name_${id}`}>
                            <b>Scenario {number} name:</b>
                        </label>
                        <TextInput
                            id={`name_${id}`}
                            value={name}
                            onChange={(val) =>
                                dispatch({
                                    type: 'update state',
                                    state: { scenarios: { [id]: { name: val } } },
                                })
                            }
                        />

                        <label htmlFor={`description_${id}`}>
                            <b>Scenario {number} description:</b>
                        </label>
                        <Textarea
                            id={`description_${id}`}
                            rows={6}
                            style={{ width: '38rem' }}
                            value={description}
                            onChange={(val) =>
                                dispatch({
                                    type: 'update state',
                                    state: { scenarios: { [id]: { description: val } } },
                                })
                            }
                        />
                    </section>
                ),
            )}

            <div className="mb-30">
                <label htmlFor="decisions">
                    <b>
                        Key decisions to be made / risks and constraints / areas for
                        further investigation and development
                    </b>
                    :
                </label>

                <Textarea
                    id="decisions"
                    rows={6}
                    style={{ width: '38rem' }}
                    value={state.decisions}
                    onChange={(val) =>
                        dispatch({ type: 'update state', state: { decisions: val } })
                    }
                />
            </div>
        </section>
    );
}

export const commentaryModule: UiModule<State, Action, never> = {
    name: 'commentary',
    component: Commentary,
    initialState: () => {
        return {
            brief: '',
            context: '',
            decisions: '',
            scenarios: {},
        };
    },
    reducer: (state, action) => {
        switch (action.type) {
            case 'update state':
                return [safeMerge(state, action.state)];
            case 'external data update':
                return [action.state];
        }
    },
    effector: assertNever,
    shims: {
        extractUpdateAction: ({ project }) => {
            const scenarios: State['scenarios'] = Object.fromEntries(
                Object.entries(project.data)
                    .filter(([scenarioId]) => scenarioId !== 'master')
                    .map(([scenarioId, data]) => [
                        scenarioId,
                        {
                            number: parseInt(scenarioId.charAt(8), 10),
                            name: data?.scenario_name ?? '',
                            description: data?.scenario_description ?? '',
                        },
                    ]),
            );

            return Result.ok([
                {
                    type: 'external data update',
                    state: {
                        brief: project.data['master']?.household?.commentary_brief ?? '',
                        context:
                            project.data['master']?.household?.commentary_context ?? '',
                        decisions:
                            project.data['master']?.household?.commentary_decisions ?? '',
                        scenarios: scenarios,
                    },
                },
            ]);
        },
        mutateLegacyData: ({ project }, _context, state) => {
            /* eslint-disable-next-line
               @typescript-eslint/no-explicit-any,
               @typescript-eslint/consistent-type-assertions,
               @typescript-eslint/no-unsafe-assignment,
            */
            const projectCasted: z.input<typeof projectSchema> = project as any;

            projectCasted.data['master'] = projectCasted.data['master'] ?? {};
            projectCasted.data['master'].household =
                projectCasted.data['master'].household ?? {};
            projectCasted.data['master'].household.commentary_brief = state.brief;
            projectCasted.data['master'].household.commentary_context = state.context;
            projectCasted.data['master'].household.commentary_decisions = state.decisions;

            for (const scenarioId of Object.keys(projectCasted.data)) {
                const stateData = state.scenarios[scenarioId];
                if (stateData === undefined) {
                    continue;
                }

                const data = projectCasted.data[scenarioId] ?? {};
                data.scenario_name = stateData.name;
                data.scenario_description = stateData.description;
                projectCasted.data[scenarioId] = data;
            }
        },
    },
};
