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
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../output-components/modal';
import { Spinner } from '../output-components/spinner';

type ProjectStatus = Project['status'];
type ProjectAccess = Project['access'];

type Fetchable<T> =
  | { status: 'at rest' | 'in flight' }
  | { status: 'successful'; data: T }
  | { status: 'failed'; error: unknown };
type FetchStatus = Fetchable<unknown>['status'];

type SaveableField = 'name' | 'status' | 'description';
type Saveable<T> = { stored: T; user: T | null; status: FetchStatus };

type OrgMember = { id: string; name: string; email: string };

type ModalShareState = {
  type: 'share';
  user: string | null;
  members: Fetchable<OrgMember[]>;
  alreadyShared: string[];
};

type ModalReassignState = {
  type: 'reassign';
  user: string | null;
  members: Fetchable<OrgMember[]>;
  access: ProjectAccess;
  currentUserId: string;
};

export type State = {
  projectId: string;
  name: Saveable<string>;
  description: Saveable<string>;
  status: Saveable<ProjectStatus>;
  createdAt: Date;
  access: ProjectAccess;
  currentUserId: string;
  currentUserNoLongerHasAccess: boolean;
  organisation: Organisation | null;
  canShare: boolean;
  canReassign: boolean;
  modal: ModalShareState | ModalReassignState | null;
};

export type Action =
  | { type: 'extractor update'; project: Project; userId: string }
  | { type: 'close modal' }
  | { type: 'save name'; name: string }
  | { type: 'save description'; description: string }
  | { type: 'save status'; status: ProjectStatus }
  | { type: 'open share modal' }
  | { type: 'organisation member data fetched'; members: OrgMember[] }
  | { type: 'select user'; userId: string }
  | { type: 'initiate share' }
  | { type: 'unshare with user'; userId: string }
  | { type: 'use new access data'; access: ProjectAccess }
  | {
      type: 'request status updated';
      field: SaveableField;
      status: FetchStatus;
    }
  | { type: 'open reassign modal' }
  | { type: 'initiate reassignment' };

export type Effect =
  | {
      type: 'save';
      projectId: string;
      field: SaveableField;
      data: Partial<{ name: string; description: string; status: ProjectStatus }>;
    }
  | { type: 'get members'; id: string }
  | { type: 'share'; projectId: string; userId: string }
  | { type: 'unshare'; projectId: string; userId: string }
  | { type: 'reassign'; projectId: string; userId: string };

function ShareModal({
  modalState,
  dispatch,
}: {
  modalState: ModalShareState;
  dispatch: Dispatcher<Action>;
}) {
  function closeModal() {
    dispatch({ type: 'close modal' });
  }
  function selectUser(userId: string) {
    dispatch({ type: 'select user', userId });
  }
  function share() {
    dispatch({ type: 'initiate share' });
  }

  const options =
    modalState.members.status === 'successful'
      ? modalState.members.data.map((member) => {
          const alreadyShared = modalState.alreadyShared.includes(member.id);
          return {
            value: member.id,
            display: `${member.name} <${member.email}>${
              alreadyShared ? ' (already has access)' : ''
            }`,
            disabled: alreadyShared,
          };
        })
      : [];

  return (
    <Modal onClose={closeModal} headerId="modal-header">
      <ModalHeader title="Share project" onClose={closeModal} />
      <ModalBody>
        {modalState.members.status === 'successful' && (
          <>
            <p>Share with:</p>
            <Select
              options={options}
              onChange={selectUser}
              value={modalState.user}
              className="input--auto-width"
            />
          </>
        )}
        {modalState.members.status === 'failed' && <p>Loading member list failed</p>}
        {(modalState.members.status === 'in flight' ||
          modalState.members.status === 'at rest') && <p>Loading member list...</p>}
      </ModalBody>
      <ModalFooter>
        <button
          className="btn btn-primary"
          onClick={share}
          disabled={modalState.user === null}
        >
          Share
        </button>
      </ModalFooter>
    </Modal>
  );
}

function ReassignModal({
  modalState,
  dispatch,
}: {
  modalState: ModalReassignState;
  dispatch: Dispatcher<Action>;
}) {
  function closeModal() {
    dispatch({ type: 'close modal' });
  }
  function selectUser(userId: string) {
    dispatch({ type: 'select user', userId });
  }
  function reassign() {
    dispatch({ type: 'initiate reassignment' });
  }

  const currentOwnerId =
    modalState.access.find((user) => user.roles.includes('owner'))?.id ?? null;
  const currentUser =
    modalState.access.find((user) => user.id === modalState.currentUserId) ?? null;
  const willLoseAccess =
    currentUser !== null &&
    currentUser.id === currentOwnerId &&
    !currentUser.roles.includes('org_admin') &&
    !currentUser.roles.includes('editor');

  const options =
    modalState.members.status === 'successful'
      ? modalState.members.data.map((member) => {
          const isOwner = currentOwnerId === member.id;
          return {
            value: member.id,
            display: `${member.name} <${member.email}>${
              isOwner ? ' (current owner)' : ''
            }`,
            disabled: isOwner,
          };
        })
      : [];

  return (
    <Modal onClose={closeModal} headerId="modal-header">
      <ModalHeader title="Reassign project" onClose={closeModal} />
      <ModalBody>
        {modalState.members.status === 'successful' && (
          <>
            <p>Reassign to:</p>
            <Select
              options={options}
              onChange={selectUser}
              value={modalState.user}
              className="input--auto-width"
            />

            {willLoseAccess && (
              <p>After reassignment you will no longer have access to this project.</p>
            )}
          </>
        )}
        {modalState.members.status === 'failed' && <p>Loading member list failed</p>}
        {(modalState.members.status === 'in flight' ||
          modalState.members.status === 'at rest') && <p>Loading member list...</p>}
      </ModalBody>
      <ModalFooter>
        <button
          className="btn btn-primary"
          onClick={reassign}
          disabled={modalState.user === null}
        >
          Reassign
        </button>
      </ModalFooter>
    </Modal>
  );
}

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

function Access({ state, dispatch }: { state: State; dispatch: Dispatcher<Action> }) {
  return (
    <section className="line-top">
      <h3 className="mt-0">Access</h3>

      <FormGrid>
        <span>Organisation:</span>
        <span>{state.organisation === null ? 'None' : state.organisation.name}</span>

        <span>Access:</span>
        <span>
          <table className="table table--vertical-middle">
            <thead>
              <tr>
                <th className="text-left">User</th>
                <th className="text-left">Email</th>
                <th className="text-left">Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {state.access.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.roles.map((role) => displayRole(role)).join(', ')}</td>
                  <td>
                    {state.canShare && user.roles.includes('editor') && (
                      <button
                        className="btn btn-danger"
                        onClick={() => {
                          dispatch({
                            type: 'unshare with user',
                            userId: user.id,
                          });
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(state.canShare || state.canReassign) && (
                <tr>
                  <td colSpan={4}>
                    <div className="d-flex gap-7">
                      {state.canShare && (
                        <button
                          className="btn"
                          onClick={() => {
                            dispatch({
                              type: 'open share modal',
                            });
                          }}
                        >
                          Share...
                        </button>
                      )}

                      {state.canReassign && (
                        <button
                          className="btn"
                          onClick={() => {
                            dispatch({
                              type: 'open reassign modal',
                            });
                          }}
                        >
                          Reassign owner...
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
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
      <Access state={state} dispatch={dispatch} />

      {state.modal !== null && state.modal.type === 'share' && (
        <ShareModal modalState={state.modal} dispatch={dispatch} />
      )}
      {state.modal !== null && state.modal.type === 'reassign' && (
        <ReassignModal modalState={state.modal} dispatch={dispatch} />
      )}
      {state.currentUserNoLongerHasAccess && (
        <div className="dialog-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-header"
            className="notbootstrap"
          >
            <ModalHeader title="Access revoked" />
            <ModalBody>
              <p>You no longer have access to this project.</p>
            </ModalBody>
          </div>
        </div>
      )}
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
      currentUserId: '',
      currentUserNoLongerHasAccess: false,
      access: [],
      canShare: false,
      canReassign: false,
      modal: null,
    };
  },
  reducer: (state: State, action: Action): [State, Effect[]?] => {
    switch (action.type) {
      case 'extractor update': {
        const { project, userId } = action;
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
          currentUserId: userId,
          organisation: project.organisation,
          access: project.access,
          canShare: project.permissions.can_share,
          canReassign: project.permissions.can_reassign,
        };
        return [newState];
      }

      case 'close modal': {
        return [{ ...state, modal: null }];
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

      case 'open reassign modal': {
        if (state.organisation === null) {
          console.error('Ownership can only be reassigned within an organisation');
          return [state];
        }

        return [
          {
            ...state,
            modal: {
              type: 'reassign',
              user: null,
              access: state.access,
              currentUserId: state.currentUserId,
              members: { status: 'at rest' },
            },
          },
          [{ type: 'get members', id: state.organisation.id }],
        ];
      }

      case 'open share modal': {
        if (state.organisation === null) {
          console.error('Open share modal can only be used with an organisation');
          return [state];
        }

        return [
          {
            ...state,
            modal: {
              type: 'share',
              user: null,
              alreadyShared: state.access.map((user) => user.id),
              members: { status: 'at rest' },
            },
          },
          [{ type: 'get members', id: state.organisation.id }],
        ];
      }

      case 'select user': {
        if (state.modal !== null) {
          return [
            {
              ...state,
              modal: {
                ...state.modal,
                user: action.userId,
              },
            },
          ];
        }
        return [state];
      }

      case 'initiate share': {
        if (
          state.modal !== null &&
          state.modal.type === 'share' &&
          state.modal.user !== null
        ) {
          return [
            state,
            [
              {
                type: 'share',
                projectId: state.projectId,
                userId: state.modal.user,
              },
            ],
          ];
        } else {
          return [state];
        }
      }

      case 'initiate reassignment': {
        if (
          state.modal !== null &&
          state.modal.type === 'reassign' &&
          state.modal.user !== null
        ) {
          return [
            state,
            [
              {
                type: 'reassign',
                projectId: state.projectId,
                userId: state.modal.user,
              },
            ],
          ];
        } else {
          return [state];
        }
      }

      case 'organisation member data fetched': {
        if (state.modal !== null) {
          const { members } = action;
          return [
            {
              ...state,
              modal: {
                ...state.modal,
                members: {
                  data: members,
                  status: 'successful',
                },
              },
            },
          ];
        } else {
          return [state];
        }
      }

      case 'unshare with user': {
        return [
          state,
          [
            {
              type: 'unshare',
              projectId: state.projectId,
              userId: action.userId,
            },
          ],
        ];
      }

      case 'use new access data': {
        const currentUser = action.access.find((user) => user.id === state.currentUserId);
        const currentUserNoLongerHasAccess = currentUser === undefined;

        return [
          {
            ...state,
            currentUserNoLongerHasAccess,
            access: action.access,
          },
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
          console.log(err);
          dispatch({
            type: 'request status updated',
            field: effect.field,
            status: 'failed',
          });
        }
        break;
      }

      case 'get members': {
        const organisations = await apiClient.listOrganisations();
        const ourOrg = organisations.unwrap().find((org) => org.id === effect.id);
        if (ourOrg !== undefined) {
          dispatch({
            type: 'organisation member data fetched',
            members: ourOrg.members.map(({ id, name, email }) => ({
              id,
              name,
              email,
            })),
          });
        }
        break;
      }

      case 'share': {
        const { projectId, userId } = effect;
        const access = await apiClient.shareAssessment(projectId, userId);
        dispatch({ type: 'close modal' });
        dispatch({
          type: 'use new access data',
          access,
        });
        break;
      }

      case 'unshare': {
        const { projectId, userId } = effect;
        const access = await apiClient.unshareAssessment(projectId, userId);
        dispatch({
          type: 'use new access data',
          access,
        });
        break;
      }

      case 'reassign': {
        const { projectId, userId } = effect;
        const response = await apiClient.updateAssessment(projectId, {
          owner: userId,
        });
        dispatch({ type: 'close modal' });

        if (response !== null) {
          const { access } = response;
          dispatch({
            type: 'use new access data',
            access,
          });
        }

        break;
      }
    }
  },
  shims: {
    extractUpdateAction: ({ project, userId }) => {
      return Result.ok([{ type: 'extractor update', project, userId }]);
    },

    mutateLegacyData: ({ project: projectRaw }, _context, state) => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const project = projectRaw as z.input<typeof projectSchema>;
      project.name = state.name.stored;
      project.description = state.description.stored;
      project.status = state.status.stored;
      project.access = state.access;
    },
  },
};
