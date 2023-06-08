import React from 'react';
import { z } from 'zod';
import { HTTPClient } from '../../api/http';
import type { Organisation } from '../../data-schemas/api-metadata';
import type { Project } from '../../data-schemas/project';
import { projectSchema } from '../../data-schemas/project';
import { Result } from '../../helpers/result';
import { safeMerge } from '../../helpers/safe-merge';
import { Tick } from '../icons';
import { FormGrid } from '../input-components/forms';
import { Select } from '../input-components/select';
import { TextInput } from '../input-components/text';
import type { Dispatcher, UiModule } from '../module-management/module-type';
import { Spinner } from '../output-components/spinner';

type ProjectStatus = Project['status'];
type ProjectAccess = Project['access'];

type FetchStatus = 'at rest' | 'in flight' | 'successful' | 'failed';
type SaveableField = 'name' | 'status' | 'description';
type Saveable<T> = { stored: T; user: T | null; status: FetchStatus };

export type State = {
    projectId: string;
    name: Saveable<string>;
    description: Saveable<string>;
    status: Saveable<ProjectStatus>;
    createdAt: Date;
    access: ProjectAccess;
    organisation: Organisation | null;
};

export type Action =
    | { type: 'extractor update'; project: Project }
    | { type: 'save name'; name: string }
    | { type: 'save description'; description: string }
    | { type: 'save status'; status: ProjectStatus }
    | {
          type: 'request status updated';
          field: SaveableField;
          status: FetchStatus;
      };

export type Effect = {
    type: 'save';
    projectId: string;
    field: SaveableField;
    data: Partial<{ name: string; description: string; status: ProjectStatus }>;
};

function FetchStatus({ status }: { status: FetchStatus }) {
    return (
        <>
            {status === 'in flight' && <Spinner className="ml-7" />}
            {status === 'successful' && <Tick className="ml-7" />}
            {status === 'failed' && (
                <span className="ml-15">Save failed, please try again</span>
            )}
        </>
    );
}

function Meta({ state, dispatch }: { state: State; dispatch: Dispatcher<Action> }) {
    return (
        <section className="mb-30">
            <FormGrid>
                <label htmlFor="name">Name:</label>
                <span className="d-flex align-items-center">
                    <TextInput
                        id="name"
                        value={state.name.user ?? ''}
                        style={{ width: '25rem' }}
                        onChange={(name) => dispatch({ type: 'save name', name })}
                        onKeyDown={(
                            evt: React.KeyboardEvent<HTMLInputElement> & {
                                target: HTMLInputElement;
                            },
                        ) => {
                            if (evt.key === 'Enter') {
                                dispatch({
                                    type: 'save name',
                                    name: evt.target.value,
                                });
                            }
                        }}
                    />
                    <FetchStatus status={state.name.status} />
                </span>

                <label htmlFor="description">Description:</label>
                <span className="d-flex align-items-center">
                    <TextInput
                        id="description"
                        value={state.description.user ?? ''}
                        style={{ width: '25rem' }}
                        onChange={(description) =>
                            dispatch({ type: 'save description', description })
                        }
                        onKeyDown={(
                            evt: React.KeyboardEvent<HTMLInputElement> & {
                                target: HTMLInputElement;
                            },
                        ) => {
                            if (evt.key === 'Enter') {
                                dispatch({
                                    type: 'save description',
                                    description: evt.target.value,
                                });
                            }
                        }}
                    />
                    <FetchStatus status={state.description.status} />
                </span>

                <label htmlFor="status">Status:</label>
                <span className="d-flex align-items-center">
                    <Select
                        id="status"
                        options={[
                            { value: 'Complete', display: 'Complete' },
                            { value: 'In progress', display: 'In progress' },
                            { value: 'For review', display: 'For review' },
                            { value: 'Test', display: 'Test' },
                        ]}
                        value={state.status.user}
                        onChange={(status) => {
                            dispatch({ type: 'save status', status });
                        }}
                    />
                    <FetchStatus status={state.status.status} />
                </span>

                <span>Created:</span>
                <span>{state.createdAt.toLocaleString('en-GB')}</span>
            </FormGrid>
        </section>
    );
}

function displayRole(role: ProjectAccess[number]['roles'][number]) {
    switch (role) {
        case 'owner':
            return 'Owner';
        case 'org_admin':
            return 'Organisation admin';
        case 'editor':
            return 'Editor';
    }
}

function Access({ state }: { state: State }) {
    return (
        <section className="line-top">
            <h3 className="mt-0">Access</h3>

            <FormGrid>
                <span>Organisation:</span>
                <span>
                    {state.organisation === null ? 'None' : state.organisation.name}
                </span>

                <span>Access:</span>
                <span>
                    <table className="table table--vertical-middle">
                        <thead>
                            <tr>
                                <th className="text-left">User</th>
                                <th className="text-left">Email</th>
                                <th className="text-left">Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            {state.access.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        {user.roles
                                            .map((role) => displayRole(role))
                                            .join(', ')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </span>
            </FormGrid>
        </section>
    );
}

function Project({ state, dispatch }: { state: State; dispatch: Dispatcher<Action> }) {
    return (
        <>
            <Meta state={state} dispatch={dispatch} />
            <Access state={state} />
        </>
    );
}

export const projectModule: UiModule<State, Action, Effect> = {
    name: 'project',
    component: Project,
    initialState: () => {
        return {
            projectId: '',
            createdAt: new Date(),
            name: { stored: '', user: null, status: 'at rest' },
            description: { stored: '', user: null, status: 'at rest' },
            status: { stored: 'In progress', user: null, status: 'at rest' },
            organisation: null,
            organisationMembers: { status: 'at rest' },
            access: [],
        };
    },
    reducer: (state: State, action: Action): [State, Effect[]?] => {
        switch (action.type) {
            case 'extractor update': {
                const { project } = action;
                const newState = {
                    ...state,
                    projectId: project.id,
                    createdAt: project.created_at,
                    name: {
                        stored: project.name,
                        user: state.name.user ?? project.name,
                        status: state.name.status,
                    },
                    description: {
                        stored: project.description,
                        user: state.description.user ?? project.description,
                        status: state.description.status,
                    },
                    status: {
                        stored: project.status,
                        user: state.status.user ?? project.status,
                        status: state.status.status,
                    },
                    organisation: project.organisation,
                    access: project.access,
                };
                return [newState];
            }

            case 'save name': {
                const { projectId } = state;
                const { name } = action;
                return [
                    safeMerge(state, { name: { user: name } }),
                    [{ type: 'save', projectId, field: 'name', data: { name } }],
                ];
            }

            case 'save description': {
                const { projectId } = state;
                const { description } = action;
                return [
                    safeMerge(state, { description: { user: description } }),
                    [
                        {
                            type: 'save',
                            projectId,
                            field: 'description',
                            data: { description },
                        },
                    ],
                ];
            }

            case 'save status': {
                const { projectId } = state;
                const { status } = action;
                return [
                    safeMerge(state, { status: { user: status } }),
                    [{ type: 'save', projectId, field: 'status', data: { status } }],
                ];
            }

            case 'request status updated': {
                state[action.field].status = action.status;
                if (action.status === 'successful') {
                    const newStored = state[action.field].user;
                    if (newStored !== null) {
                        state[action.field].stored = newStored;
                    }
                }
                return [state];
            }
        }
    },
    effector: async (effect, dispatch) => {
        const apiClient = new HTTPClient();

        switch (effect.type) {
            case 'save': {
                dispatch({
                    type: 'request status updated',
                    field: effect.field,
                    status: 'in flight',
                });
                try {
                    await apiClient.updateAssessment(effect.projectId, effect.data);
                    dispatch({
                        type: 'request status updated',
                        field: effect.field,
                        status: 'successful',
                    });
                } catch (err) {
                    dispatch({
                        type: 'request status updated',
                        field: effect.field,
                        status: 'failed',
                    });
                }
                break;
            }
        }
    },
    shims: {
        extractUpdateAction: ({ project }) => {
            return Result.ok([{ type: 'extractor update', project }]);
        },

        mutateLegacyData: ({ project: projectRaw }, _context, state) => {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            const project = projectRaw as z.input<typeof projectSchema>;
            project.name = state.name.stored;
            project.description = state.description.stored;
            project.status = state.status.stored;
        },
    },
};
