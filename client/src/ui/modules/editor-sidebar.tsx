import React, { ReactElement, useContext, useEffect, useRef } from 'react';
import z from 'zod';

import type { Project, projectSchema } from '../../data-schemas/project';
import type { Scenario } from '../../data-schemas/scenario';
import { assertNever } from '../../helpers/assert-never';
import { emulateJsonRoundTrip } from '../../helpers/emulate-json-round-trip';
import { Result } from '../../helpers/result';
import { CombinedModules } from '../../model/combined-modules';
import { DownCaret, LockedLock, RightCaret } from '../icons';
import type { Dispatcher, UiModule } from '../module-management/module-type';
import { NumberOutput } from '../output-components/numeric';
import type { ScenarioPageName, StandalonePageName } from '../pages';
import { pageTitles } from '../pages';
import type { Route } from '../routes';

type SidebarContextType = {
    route: Route | null;
};

export const SidebarContext = React.createContext<SidebarContextType>({
    route: null,
});

export type State = {
    route: Route | null;
    hasReports: boolean;
    scenarios: {
        id: string;
        title: string;
        isBaseline: boolean;
        num: number;
        locked: boolean;
        createdFromChanges: ChangeSinceCreation;
        createdFromName: string | null;
        spaceHeatingDemand: number | null;
        expanded: boolean;
        justCreated: boolean;
    }[];
    mutateAction: DuplicateScenarioAction | SetLockAction | DeleteScenarioAction | null;
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

export type Action =
    | MergeDataAction
    | ToggleExpansionAction
    | DuplicateScenarioAction
    | SetLockAction
    | DeleteScenarioAction;

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
    route,
    dispatch,
}: {
    scenario: State['scenarios'][0];
    route: Route | null;
    dispatch: Dispatcher<Action>;
}) {
    const scenarioRef = useRef<HTMLDivElement>(null);

    const { id, title, isBaseline, locked } = scenario;
    const isCurrent =
        route !== null && route.type === 'with scenario' && route.scenarioId === id;

    function toggleExpanded() {
        dispatch({
            type: 'toggle scenario expansion',
            scenarioId: id,
        });
    }

    useEffect(() => {
        if (scenario.justCreated === true && scenarioRef.current !== null) {
            scenarioRef.current.scrollIntoView({ behavior: 'smooth' });

            // This is the place where all the right state is available to perform the
            // post-scenario-creation navigation, but it's not a good place (there is
            // no good place at the time of writing). I think this ugliness will fall
            // out of the system when we aren't mutating & extracting data all the time,
            // so it's left as a hack in the meantime.
            if (route !== null && route.type === 'with scenario') {
                window.location.hash = `${scenario.id}/${route.page}`;
            }
        }
        // We only want this to trigger when justCreated changed, not when route or
        // scenario change - because we would otherwise end up re-navigating every
        // re-render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scenario.justCreated]);

    return (
        <div
            className={`sidebar-scenario ${isCurrent ? 'sidebar-scenario--current' : ''}`}
            ref={scenarioRef}
        >
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
                    <NumberOutput value={scenario.spaceHeatingDemand} dp={0} />
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
                            title={`Create a new scenario based on "${title}"`}
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
                            New
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

function EditorSidebar({
    state,
    dispatch,
}: {
    state: State;
    dispatch: Dispatcher<Action>;
}) {
    return (
        <SidebarContext.Provider value={{ route: state.route }}>
            <div className="side-section">
                <ul className="list-unstyled">
                    <StandalonePageLink pageName="project" />
                    <StandalonePageLink pageName="address-search" />
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
                        route={state.route}
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

export const editorSidebarModule: UiModule<State, Action, never> = {
    name: 'editorSidebar',
    component: EditorSidebar,
    initialState: () => {
        return {
            currentPageName: null,
            hasReports: false,
            scenarios: [],
            mutateAction: null,
            modal: { type: 'none' },
            route: null,
        };
    },
    reducer: (state, action) => {
        for (const scenario of state.scenarios) {
            scenario.justCreated = false;
        }

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
        }
    },
    effector: assertNever,
    shims: {
        extractUpdateAction: ({ route, project }) => {
            return Result.ok([
                {
                    type: 'merge data',
                    state: {
                        hasReports: project.organisation !== null,
                        route,
                        scenarios: Object.entries(project.data).map(
                            ([scenarioId, scenarioData]) => ({
                                id: scenarioId,
                                title: scenarioData?.scenario_name ?? '',
                                isBaseline: scenarioId === 'master',
                                locked: scenarioData?.locked ?? false,
                                num: 1,
                                createdFromChanges: getCreatedChanges(
                                    project,
                                    scenarioData,
                                ),
                                createdFromName: scenarioData?.created_from ?? null,
                                spaceHeatingDemand:
                                    scenarioData?.space_heating_demand_m2 ?? null,
                                expanded:
                                    scenarioData?.sidebarExpanded ??
                                    (route.type === 'with scenario' &&
                                    route.scenarioId === scenarioId
                                        ? true
                                        : false),
                                justCreated: scenarioData?.justCreated ?? false,
                            }),
                        ),
                        mutateAction: null,
                    },
                },
            ]);
        },
        mutateLegacyData: ({ project: projectRaw }, _context, state) => {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            const project = projectRaw as z.input<typeof projectSchema>;

            let newId: string | null = null;

            if (state.mutateAction !== null) {
                const action = state.mutateAction;
                switch (action.type) {
                    case 'duplicate scenario': {
                        newId = duplicateScenario(
                            project.data,
                            action.scenarioToDuplicate,
                            action.title,
                        );
                        break;
                    }
                    case 'set scenario lock': {
                        const scenario = project.data[action.scenarioId];
                        if (scenario !== undefined) {
                            scenario.locked = action.locked;
                        }
                        break;
                    }
                    case 'delete scenario': {
                        delete project.data[action.scenarioId];
                        break;
                    }
                }
            }

            for (const [scenarioId, scenarioData] of Object.entries(project.data)) {
                if (scenarioData === undefined) {
                    continue;
                }
                const expandedFlag =
                    state.scenarios.find((row) => row.id === scenarioId)?.expanded ??
                    false;
                const isNew = scenarioId === newId;
                scenarioData.sidebarExpanded = expandedFlag || isNew;
                scenarioData.justCreated = isNew;
            }
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

/**
 * Duplicate scenario `scenarioId`, return the new scenario's ID.
 */
function duplicateScenario(
    scenarioData: Record<string, unknown>,
    scenarioId: string,
    title: string,
): string {
    /* eslint-disable
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-member-access,
       @typescript-eslint/no-unsafe-assignment
    */
    const newScenario: any = emulateJsonRoundTrip(scenarioData[scenarioId]);
    newScenario.locked = false;
    delete newScenario.model;
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
    newScenario.model = CombinedModules.fromLegacy(newScenario);
    /* eslint-enable */

    let n = 0;
    for (const scenarioId of Object.keys(scenarioData)) {
        const scenarioNumber = scenarioId.slice(8);
        if (scenarioId !== 'master' && n.toString() !== scenarioNumber) {
            // If a scenario is deleted, when we create a new one it, that will take the
            // deleted one's position. E.g. we have master, scenario1 and scenario2.
            // We delete scenario1. We create a new one, which becomes scenario1.
            break;
        }
        n++;
    }
    const newId = 'scenario' + n.toString();
    scenarioData[newId] = newScenario;
    scenarioData = Object.fromEntries(
        Object.keys(scenarioData)
            .sort()
            .map((key) => [key, scenarioData[key]]),
    );

    return newId;
}
