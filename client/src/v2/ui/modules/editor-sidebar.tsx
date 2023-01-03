import React, { useRef, useContext, ReactElement } from 'react';
import type { RefObject } from 'react';

import { HTTPClient } from '../../api/http';
import type { Project } from '../../data-schemas/project';
import type { Scenario } from '../../data-schemas/scenario';
import { emulateJsonRoundTrip } from '../../helpers/emulate-json-round-trip';
import { featureFlags } from '../../helpers/feature-flags';
import { Result } from '../../helpers/result';
import { EditIcon, LockedLock, DownCaret, RightCaret } from '../icons';
import { FormGrid } from '../input-components/forms';
import { TextInput } from '../input-components/text';
import type { UiModule, Dispatcher } from '../module-management/module-type';
import { Modal, ModalBody, ModalHeader, ModalFooter } from '../output-components/modal';
import { NumericOutput, noOutput } from '../output-components/numeric';
import { Spinner } from '../output-components/spinner';
import type { StandalonePageName, ScenarioPageName } from '../pages';
import { pageTitles } from '../pages';
import type { ResolvedRoute } from '../routes';

type SidebarContextType = {
    route: ResolvedRoute | null;
};

export const SidebarContext = React.createContext<SidebarContextType>({
    route: null,
});

type FetchStatus = 'at rest' | 'in flight' | 'successful' | 'failed';

type MetadataEditorModalState = {
    type: 'metadata editor';
    name: string;
    description: string;
    requestStatus: FetchStatus;
};

type State = {
    assessmentId: string;
    projectName: string;
    projectDescription: string;
    route: ResolvedRoute | null;
    hasReports: boolean;
    scenarios: {
        id: string;
        title: string;
        isBaseline: boolean;
        num: number;
        locked: boolean;
        createdFromChanges: ChangeSinceCreation;
        createdFromName: string | null;
        shd: number | typeof noOutput;
        expanded: boolean;
    }[];
    mutateAction: DuplicateScenarioAction | SetLockAction | DeleteScenarioAction | null;
    modal: MetadataEditorModalState | { type: 'none' };
};

type MergeDataAction = { type: 'merge data'; state: Partial<State> };
type ToggleExpansionAction = { type: 'toggle scenario expansion'; scenarioId: string };
type DuplicateScenarioAction = {
    type: 'duplicate scenario';
    scenarioToDuplicate: string;
    title: string;
};
type SetLockAction = { type: 'set scenario lock'; scenarioId: string; locked: boolean };
type DeleteScenarioAction = { type: 'delete scenario'; scenarioId: string };
type SaveMetadataAction = {
    type: 'save project metadata';
    returnFocusTo: RefObject<HTMLElement>;
};
type MetadataSaveStatusAction = {
    type: 'metadata save status';
    status: FetchStatus;
};

type Action =
    | MergeDataAction
    | ToggleExpansionAction
    | DuplicateScenarioAction
    | SetLockAction
    | DeleteScenarioAction
    | SaveMetadataAction
    | MetadataSaveStatusAction;

type Effect = {
    type: 'save project info';
    assessmentId: string;
    name: string;
    description: string;
    returnFocusTo: RefObject<HTMLElement>;
};

function StandalonePageLink(props: { pageName: StandalonePageName }): ReactElement {
    const { route } = useContext(SidebarContext);
    const isCurrentPage =
        route !== null && route.type === 'standalone' && route.page === props.pageName;

    return (
        <li>
            <a
                className={`sidebar-link ${isCurrentPage ? 'sidebar-link--current' : ''}`}
                href={`#${props.pageName}`}
            >
                {pageTitles[props.pageName]}
            </a>
        </li>
    );
}

function ScenarioPageLink(props: {
    pageName: ScenarioPageName;
    scenarioId: string;
}): ReactElement {
    const { route } = useContext(SidebarContext);
    const isCurrentPage =
        route !== null &&
        route.type === 'with scenario' &&
        route.page === props.pageName &&
        route.scenarioId === props.scenarioId;

    return (
        <li>
            <a
                className={`sidebar-link ${isCurrentPage ? 'sidebar-link--current' : ''}`}
                href={`#${props.scenarioId}/${props.pageName}`}
            >
                {pageTitles[props.pageName]}
            </a>
        </li>
    );
}

function ScenarioBlock({
    scenario,
    dispatch,
}: {
    scenario: State['scenarios'][0];
    dispatch: Dispatcher<Action>;
}) {
    const { id, title, isBaseline, locked } = scenario;

    function toggleExpanded() {
        dispatch({
            type: 'toggle scenario expansion',
            scenarioId: id,
        });
    }

    return (
        <div>
            <div
                className="d-flex sidebar-link"
                style={{ padding: '5px 0' }}
                onClick={toggleExpanded}
                onKeyDown={(evt) => {
                    if (evt.key === 'Enter') {
                        toggleExpanded();
                    }
                }}
                role="button"
                aria-expanded={scenario.expanded}
                aria-labelledby={`sidebar-scenario-${id}-title`}
                aria-controls={`sidebar-scenario-${id}-menu`}
                tabIndex={0}
            >
                {scenario.expanded ? (
                    <DownCaret style={{ padding: '2px', flexShrink: 0 }} />
                ) : (
                    <RightCaret style={{ padding: '2px', flexShrink: 0 }} />
                )}

                <div style={{ flexGrow: 1 }}>
                    <b id={`sidebar-scenario-${id}-title`}>{title}</b>
                    {locked ? <LockedLock /> : null}

                    {scenario.expanded && scenario.createdFromName !== null ? (
                        <div
                            title={
                                scenario.createdFromChanges === 'changed'
                                    ? `${scenario.createdFromName} has changed since the creation of ${title}"`
                                    : ''
                            }
                        >
                            Based on {scenario.createdFromName}{' '}
                            {scenario.createdFromChanges === 'deleted'
                                ? ' (deleted)'
                                : ''}
                            {scenario.createdFromChanges === 'changed' ? '*' : ''}
                        </div>
                    ) : null}
                </div>
                <div style={{ marginRight: '10px' }}>
                    <NumericOutput value={scenario.shd} dp={0} />
                </div>
            </div>

            {scenario.expanded && (
                <ul
                    id={`sidebar-scenario-${id}-menu`}
                    role="region"
                    aria-labelledby={`sidebar-scenario-${id}-title`}
                    className="list-unstyled side-section"
                >
                    <li style={{ padding: '4px 20px' }}>
                        <button
                            className="btn mr-7"
                            onClick={() => {
                                const newTitle = window.prompt(
                                    'What do you want the call the new scenario?',
                                    `Copy of ${title}`,
                                );
                                if (newTitle !== null) {
                                    dispatch({
                                        type: 'duplicate scenario',
                                        scenarioToDuplicate: id,
                                        title: newTitle,
                                    });
                                }
                            }}
                        >
                            Copy
                        </button>
                        <button
                            className="btn mr-7"
                            onClick={() => {
                                dispatch({
                                    type: 'set scenario lock',
                                    scenarioId: id,
                                    locked: !scenario.locked,
                                });
                            }}
                        >
                            {scenario.locked ? 'Unlock' : 'Lock'}
                        </button>
                        {!isBaseline && (
                            <button
                                className="btn mr-7"
                                onClick={() => {
                                    const confirm = window.confirm(
                                        'Are you sure you want to delete this scenario?',
                                    );
                                    if (confirm) {
                                        dispatch({
                                            type: 'delete scenario',
                                            scenarioId: id,
                                        });
                                    }
                                }}
                            >
                                Delete
                            </button>
                        )}
                    </li>
                    <ScenarioPageLink scenarioId={id} pageName="context" />
                    <ScenarioPageLink scenarioId={id} pageName="ventilation" />
                    <ScenarioPageLink scenarioId={id} pageName="elements" />
                    <ScenarioPageLink scenarioId={id} pageName="LAC" />
                    <ScenarioPageLink scenarioId={id} pageName="heating" />
                    <ScenarioPageLink scenarioId={id} pageName="fuel_requirements" />
                    <ScenarioPageLink scenarioId={id} pageName="generation" />
                    <ScenarioPageLink scenarioId={id} pageName="solarhotwater" />
                    <ScenarioPageLink scenarioId={id} pageName="worksheets" />
                </ul>
            )}
        </div>
    );
}

function MetadataEditorModal({
    state,
    dispatch,
    returnFocusTo,
}: {
    state: MetadataEditorModalState;
    dispatch: Dispatcher<Action>;
    returnFocusTo: RefObject<HTMLElement>;
}) {
    function close() {
        dispatch({
            type: 'merge data',
            state: { modal: { type: 'none' } },
        });
        if (returnFocusTo.current !== null) {
            returnFocusTo.current.focus();
        }
    }

    function save() {
        dispatch({ type: 'save project metadata', returnFocusTo });
    }

    return (
        <Modal headerId={'none'} onClose={close}>
            <ModalHeader title="Edit project metadata" onClose={close} />
            <ModalBody>
                <FormGrid>
                    <label htmlFor="project-name">Project name:</label>
                    {/* We use input instead of TextInput because TextInput breaks
                     * autoFocus due to its inner component shennaningans */}
                    <input
                        id="project-name"
                        type="text"
                        value={state.name}
                        style={{ width: '25rem' }}
                        onChange={(evt) =>
                            dispatch({
                                type: 'merge data',
                                state: { modal: { ...state, name: evt.target.value } },
                            })
                        }
                        onKeyDown={(
                            evt: React.KeyboardEvent<HTMLInputElement> & {
                                target: HTMLInputElement;
                            },
                        ) => {
                            if (evt.key === 'Enter') {
                                dispatch({
                                    type: 'merge data',
                                    state: {
                                        modal: { ...state, name: evt.target.value },
                                    },
                                });
                                save();
                            }
                        }}
                        // WAI-ARIA-PRACTICES tells us to use autofocus here because
                        // it's the first field in a modal dialog.
                        // https://www.w3.org/TR/wai-aria-practices-1.1/examples/dialog-modal/dialog.html
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus={true}
                    />

                    <label htmlFor="project-description">Project description:</label>
                    <TextInput
                        id="project-description"
                        value={state.description}
                        style={{ width: '25rem' }}
                        onChange={(val) =>
                            dispatch({
                                type: 'merge data',
                                state: { modal: { ...state, description: val } },
                            })
                        }
                        onKeyDown={(
                            evt: React.KeyboardEvent<HTMLInputElement> & {
                                target: HTMLInputElement;
                            },
                        ) => {
                            if (evt.key === 'Enter') {
                                dispatch({
                                    type: 'merge data',
                                    state: {
                                        modal: {
                                            ...state,
                                            description: evt.target.value,
                                        },
                                    },
                                });
                                save();
                            }
                        }}
                    />
                </FormGrid>
            </ModalBody>
            <ModalFooter>
                {state.requestStatus === 'in flight' && <Spinner className="mr-15" />}
                {state.requestStatus === 'failed' && (
                    <span className="mr-15">Save failed, please try again</span>
                )}
                <button className="btn" onClick={close}>
                    Cancel
                </button>
                <button
                    className="btn btn-primary"
                    onClick={save}
                    disabled={
                        state.requestStatus !== 'at rest' &&
                        state.requestStatus !== 'failed'
                    }
                >
                    Save
                </button>
            </ModalFooter>
        </Modal>
    );
}

function EditorSidebar({
    state,
    dispatch,
}: {
    state: State;
    dispatch: Dispatcher<Action>;
}) {
    const metadataEditorButtonRef = useRef<HTMLButtonElement>(null);

    return (
        <SidebarContext.Provider value={{ route: state.route }}>
            <div
                className="side-section d-flex justify-content-between"
                style={{ padding: '15px 10px 10px 20px' }}
            >
                <p className="mb-0">
                    <b>{state.projectName}</b>
                    <br />
                    {state.projectDescription}
                </p>

                <div>
                    <button
                        className="btn d-flex py-7"
                        ref={metadataEditorButtonRef}
                        onClick={() =>
                            dispatch({
                                type: 'merge data',
                                state: {
                                    modal: {
                                        type: 'metadata editor',
                                        requestStatus: 'at rest',
                                        name: state.projectName,
                                        description: state.projectDescription,
                                    },
                                },
                            })
                        }
                    >
                        <EditIcon />
                    </button>
                </div>
            </div>

            {state.modal.type === 'metadata editor' && (
                <MetadataEditorModal
                    state={state.modal}
                    dispatch={dispatch}
                    returnFocusTo={metadataEditorButtonRef}
                />
            )}

            <div className="side-section">
                <div className="side-section--header">Assessment</div>

                <ul className="list-unstyled">
                    {featureFlags.has('address-search-page') && (
                        <StandalonePageLink pageName="address-search" />
                    )}
                    <StandalonePageLink pageName="householdquestionnaire" />
                    <StandalonePageLink pageName="commentary" />
                    <StandalonePageLink pageName="currentenergy" />
                    <StandalonePageLink pageName="imagegallery" />
                </ul>
            </div>

            <div className="side-section">
                <div className="side-section--header">Output</div>

                <ul className="list-unstyled">
                    <StandalonePageLink pageName="compare" />
                    {state.hasReports ? <StandalonePageLink pageName="report" /> : null}
                    <StandalonePageLink pageName="scopeofworks" />
                </ul>
            </div>

            <div className="side-section" style={{ paddingBottom: '5px' }}>
                <div className="side-section--header d-flex justify-content-between">
                    <div>Scenarios</div>
                    <div>
                        <abbr title="Space Heating Demand (kWh/m²·year)">SHD</abbr>
                    </div>
                </div>

                {state.scenarios.map((scenario) => (
                    <ScenarioBlock
                        dispatch={dispatch}
                        key={scenario.id}
                        scenario={scenario}
                    />
                ))}
            </div>

            <div className="side-section">
                <div className="side-section--header">Tools &amp; Settings</div>

                <ul className="list-unstyled">
                    <StandalonePageLink pageName="export" />
                    <StandalonePageLink pageName="librariesmanager" />
                    <StandalonePageLink pageName="fuelsmanager" />
                </ul>
            </div>
        </SidebarContext.Provider>
    );
}

export const editorSidebarModule: UiModule<State, Action, Effect> = {
    name: 'editorSidebar',
    component: EditorSidebar,
    initialState: () => {
        return {
            assessmentId: '',
            projectName: '',
            projectDescription: '',
            currentPageName: null,
            hasReports: false,
            scenarios: [],
            mutateAction: null,
            modal: { type: 'none' },
            route: null,
        };
    },
    reducer: (state, action) => {
        switch (action.type) {
            case 'merge data': {
                return [{ ...state, ...action.state }];
            }
            case 'toggle scenario expansion': {
                return [
                    {
                        ...state,
                        scenarios: state.scenarios.map((scenario) => {
                            if (scenario.id === action.scenarioId) {
                                return { ...scenario, expanded: !scenario.expanded };
                            } else {
                                return scenario;
                            }
                        }),
                    },
                ];
            }

            case 'duplicate scenario':
            case 'set scenario lock':
            case 'delete scenario': {
                return [{ ...state, mutateAction: action }];
            }

            case 'save project metadata': {
                if (state.modal.type === 'metadata editor') {
                    const { assessmentId } = state;
                    const { name, description } = state.modal;
                    const { returnFocusTo } = action;
                    return [
                        state,
                        [
                            {
                                type: 'save project info',
                                assessmentId,
                                name,
                                description,
                                returnFocusTo,
                            },
                        ],
                    ];
                } else {
                    return [state];
                }
            }

            case 'metadata save status': {
                if (state.modal.type === 'metadata editor') {
                    const { status } = action;
                    if (status === 'successful') {
                        return [{ ...state, modal: { type: 'none' } }];
                    } else {
                        return [
                            {
                                ...state,
                                modal: {
                                    ...state.modal,
                                    requestStatus: status,
                                },
                            },
                        ];
                    }
                } else {
                    return [state];
                }
            }
        }
    },
    effector: async (effect, dispatch) => {
        const apiClient = new HTTPClient();

        switch (effect.type) {
            case 'save project info': {
                dispatch({ type: 'metadata save status', status: 'in flight' });
                try {
                    await apiClient.updateAssessment(effect.assessmentId, {
                        name: effect.name,
                        description: effect.description,
                    });
                    dispatch({ type: 'metadata save status', status: 'successful' });
                    dispatch({
                        type: 'merge data',
                        state: {
                            projectName: effect.name,
                            projectDescription: effect.description,
                        },
                    });
                    if (effect.returnFocusTo.current !== null) {
                        effect.returnFocusTo.current.focus();
                    }
                } catch (err) {
                    dispatch({ type: 'metadata save status', status: 'failed' });
                }
            }
        }
    },
    shims: {
        extractUpdateAction: ({ route, project }) => {
            return Result.ok({
                type: 'merge data',
                state: {
                    assessmentId: project.id,
                    projectName: project.name,
                    projectDescription: project.description,
                    hasReports: project.organisation !== null,
                    route,
                    scenarios: Object.entries(project.data).map(
                        ([scenarioId, scenarioData]) => ({
                            id: scenarioId,
                            title: scenarioData?.scenario_name ?? '',
                            isBaseline: scenarioId === 'master',
                            locked: scenarioData?.locked ?? false,
                            num: 1,
                            createdFromChanges: getCreatedChanges(project, scenarioData),
                            createdFromName: scenarioData?.created_from ?? null,
                            shd: scenarioData?.space_heating_demand_m2 ?? noOutput,
                            expanded: scenarioData?.sidebarExpanded ?? false,
                        }),
                    ),
                    mutateAction: null,
                },
            });
        },
        mutateLegacyData: ({ project }, state) => {
            /* eslint-disable
               @typescript-eslint/consistent-type-assertions,
               @typescript-eslint/no-explicit-any,
               @typescript-eslint/no-unsafe-assignment,
               @typescript-eslint/no-unsafe-member-access,
            */
            const projectAny = project as any;
            projectAny.name = state.projectName;
            projectAny.description = state.projectDescription;

            const dataAny: Record<string, any> = projectAny.data;

            if (state.mutateAction !== null) {
                const action = state.mutateAction;
                switch (action.type) {
                    case 'duplicate scenario': {
                        duplicateScenario(
                            dataAny,
                            action.scenarioToDuplicate,
                            action.title,
                        );
                        break;
                    }
                    case 'set scenario lock': {
                        dataAny[action.scenarioId].locked = action.locked;
                        break;
                    }
                    case 'delete scenario': {
                        delete dataAny[action.scenarioId];
                        break;
                    }
                }
            }

            for (const [scenarioId, scenarioData] of Object.entries(dataAny)) {
                scenarioData.sidebarExpanded =
                    state.scenarios.find((row) => row.id === scenarioId)?.expanded ??
                    false;
            }

            /* eslint-enable */
        },
    },
};

type ChangeSinceCreation = 'deleted' | 'changed' | 'none' | 'baseline';

function getCreatedChanges(project: Project, scenario: Scenario): ChangeSinceCreation {
    const createdFrom = scenario?.created_from;
    if (createdFrom === undefined) {
        return 'baseline';
    } else if (!(createdFrom in project.data)) {
        return 'deleted';
    } else if (scenarioHasChanged(scenario)) {
        return 'changed';
    } else {
        return 'none';
    }
}

function scenarioHasChanged(scenario: Scenario): boolean {
    const creationHash = scenario?.creation_hash;
    if (creationHash === undefined) {
        return false;
    }

    const currentHash = generateHash(
        JSON.stringify({
            ...scenario,
            locked: false,
        }),
    );

    return creationHash !== currentHash;
}

function generateHash(str: string): number {
    let hash = 0;
    if (str.length === 0) {
        return hash;
    }
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

/* eslint-disable
   @typescript-eslint/no-explicit-any,
   @typescript-eslint/no-unsafe-member-access,
   @typescript-eslint/no-unsafe-assignment
*/
function duplicateScenario(
    scenarioData: Record<string, any>,
    scenarioId: string,
    title: string,
) {
    let n = 0;
    for (const scenarioId of Object.keys(scenarioData)) {
        const scenarioNumber = scenarioId.slice(8);
        if (scenarioId !== 'master' && n.toString() !== scenarioNumber) {
            // if for a reason a scenario was deleted, when we create a new one it
            // takes its position. Example: we have master, scenario1 and scenario2.
            // We delete scenario1. We create a new one that becomes scenario1.
            break;
        }
        n++;
    }
    const newId = 'scenario' + n.toString();

    const newScenario: any = emulateJsonRoundTrip(scenarioData[scenarioId]);
    newScenario.locked = false;
    newScenario.creation_hash = generateHash(JSON.stringify(newScenario));
    newScenario.created_from = scenarioId;
    newScenario.scenario_name = title;
    newScenario.measures = {};
    newScenario.fabric.measures = {};
    for (const element of newScenario.fabric.elements) {
        if (element.cost_total !== undefined) {
            delete element.cost_total;
        }
    }

    scenarioData[newId] = newScenario;
    scenarioData = Object.fromEntries(
        Object.keys(scenarioData)
            .sort()
            .map((key) => [key, scenarioData[key]]),
    );
}
/* eslint-enable */
