import React, { useState, useContext, ReactElement } from 'react';
import { UpdateFunction } from '../context/UpdateFunction';

import { NewAssessment, Scenario } from '../types/Assessment';
import {
    getScenario,
    getScenarioList,
    duplicateScenario,
    scenarioHasChanged,
} from '../lib/scenarios';

import Result from '../components/Result';
import { DownCaret, RightCaret } from '../components/icons/carets';
import { LockedLock } from '../components/icons/locks';

interface SidebarLinkProps {
    text: string;
    view: string;
    scenario?: string;
}

function SidebarLink({ view, scenario, text }: SidebarLinkProps): ReactElement {
    const url = scenario ? `#${scenario}/${view}` : `#master/${view}`;
    return (
        <li>
            <a className="sidebar-link" href={url}>
                {text}
            </a>
        </li>
    );
}

type ChangeSinceCreation = 'deleted' | 'changed' | 'none' | 'baseline';

interface ScenarioBlockProps {
    assessment: NewAssessment;
    active: boolean;
    id: string;
    title: string;
    isBaseline: boolean;
    createdFromChanges: ChangeSinceCreation;
    createdFromName: string;
    locked: boolean;
    shd: number;
    setActiveScenario: (show: string | null) => void;
}

function ScenarioBlock({
    assessment,
    active,
    id,
    title,
    isBaseline,
    createdFromChanges,
    createdFromName,
    locked,
    shd,
    setActiveScenario,
}: ScenarioBlockProps): ReactElement {
    const updateFn = useContext(UpdateFunction);

    return (
        <div>
            <div
                className="d-flex sidebar-link"
                style={{ padding: '5px 0' }}
                onClick={() => setActiveScenario(active ? null : id)}
                onKeyDown={(evt) => {
                    if (evt.key === 'Enter') {
                        setActiveScenario(active ? null : id);
                    }
                }}
                role="button"
                aria-expanded={active}
                aria-labelledby={`sidebar-scenario-${id}-title`}
                aria-controls={`sidebar-scenario-${id}-menu`}
                tabIndex={0}
            >
                {active ? (
                    <DownCaret style={{ padding: '2px' }} />
                ) : (
                    <RightCaret style={{ padding: '2px' }} />
                )}

                <div style={{ flexGrow: 1 }}>
                    <b id={`sidebar-scenario-${id}-title`}>{title}</b>
                    {locked ? <LockedLock /> : null}

                    {active && createdFromName ? (
                        <div
                            title={
                                createdFromChanges === 'changed'
                                    ? `${createdFromName} has changed since the creation of ${title}"`
                                    : ''
                            }
                        >
                            Based on {createdFromName}{' '}
                            {createdFromChanges === 'deleted' ? ' (deleted)' : ''}
                            {createdFromChanges === 'changed' ? '*' : ''}
                        </div>
                    ) : null}
                </div>
                <div style={{ marginRight: '20px' }}>
                    <Result val={shd} dp={0} />
                </div>
            </div>

            {active ? (
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
                                    `Copy of ${title}`
                                );
                                if (newTitle) {
                                    duplicateScenario(assessment, id, newTitle);
                                    updateFn();
                                }
                            }}
                        >
                            Copy
                        </button>
                        {locked ? (
                            <button
                                className="btn mr-7"
                                onClick={() => {
                                    getScenario(assessment, id).locked = false;
                                    updateFn();
                                }}
                            >
                                Unlock
                            </button>
                        ) : null}
                        {!locked ? (
                            <button
                                className="btn mr-7"
                                onClick={() => {
                                    getScenario(assessment, id).locked = true;
                                    updateFn();
                                }}
                            >
                                Lock
                            </button>
                        ) : null}
                        {!isBaseline ? (
                            <button
                                className="btn mr-7"
                                onClick={() => {
                                    const confirm = window.confirm(
                                        'Are you sure you want to delete this scenario?'
                                    );
                                    if (confirm) {
                                        delete assessment[id];
                                        updateFn();
                                    }
                                }}
                            >
                                Delete...
                            </button>
                        ) : null}
                    </li>
                    <SidebarLink
                        scenario={id}
                        view={`dwellingdata`}
                        text="Dwelling data"
                    />
                    <SidebarLink
                        scenario={id}
                        view={`ventilation`}
                        text="Ventilation and infiltration"
                    />
                    <SidebarLink scenario={id} view={`elements`} text="Fabric" />
                    <SidebarLink
                        scenario={id}
                        view={`LAC`}
                        text="Lighting, appliances &amp; cooking"
                    />
                    <SidebarLink scenario={id} view={`heating`} text="Heating" />
                    <SidebarLink
                        scenario={id}
                        view={`fuel_requirements`}
                        text="Fuel requirements"
                    />
                    <SidebarLink scenario={id} view={`generation`} text="Generation" />
                    <SidebarLink
                        scenario={id}
                        view={`solarhotwater`}
                        text="Solar hot water heating"
                    />
                    <SidebarLink
                        scenario={id}
                        view={`worksheets`}
                        text="SAP worksheets"
                    />
                </ul>
            ) : null}
        </div>
    );
}

/**
 * Get the name of the scenario another scenario was created from
 *
 * We turn 'master' into 'baseline' here because it's hardcoded everywhere but not
 * a term we want to use.
 */
function getCreatedFromName(from: string | undefined): string {
    if (from === 'master') {
        return 'baseline';
    }
    return from || '';
}

function getCreatedChanges(
    assessment: NewAssessment,
    scenario: Scenario
): ChangeSinceCreation {
    if (!scenario.created_from) {
        return 'baseline';
    } else if (!(scenario.created_from in assessment)) {
        return 'deleted';
    } else if (
        scenarioHasChanged(scenario, getScenario(assessment, scenario.created_from))
    ) {
        return 'changed';
    } else {
        return 'none';
    }
}

interface SidebarProps {
    assessment: NewAssessment;
    initialExpanded: string;
    hasReports: boolean;
    name: string;
    description: string;
    username: string;
    orgname?: string;
}

/**
 * The main app sidebar.
 */
export default function Sidebar({
    assessment,
    initialExpanded,
    hasReports,
    name,
    description,
    username,
    orgname,
}: SidebarProps): ReactElement {
    const [expandedScenario, setExpandedScenario] = useState(initialExpanded);
    const scenarios = getScenarioList(assessment);

    return (
        <div>
            <div className="side-section" style={{ padding: '15px 20px 10px' }}>
                <button id="edit-project-name-and-description" style={{ float: 'right' }}>
                    <i className="icon-edit"></i>
                </button>
                <p className="mb-0">
                    <b>{name}</b>
                    <br />
                    {description}
                    <br />
                    <span className="text-italic">
                        {username}
                        {orgname ? `, ${orgname}` : ''}
                    </span>
                </p>
            </div>

            <div className="side-section">
                <div className="side-section--header">Assessment</div>

                <ul className="list-unstyled">
                    <SidebarLink view="householdquestionnaire" text="Questionnaire" />
                    <SidebarLink view="commentary" text="Commentary" />
                    <SidebarLink view="currentenergy" text="Current energy use" />
                    <SidebarLink view="imagegallery" text="Image gallery" />
                </ul>
            </div>

            <div className="side-section">
                <div className="side-section--header">Output</div>

                <ul className="list-unstyled">
                    <SidebarLink view="compare" text="Compare scenarios" />
                    {hasReports ? <SidebarLink view="report" text="Reports" /> : null}
                    <SidebarLink view="scopeofworks" text="Scope of works" />
                </ul>
            </div>

            <div className="side-section" style={{ paddingBottom: '5px' }}>
                <div className="side-section--header d-flex justify-content-between">
                    <div>Scenarios</div>
                    <div>
                        <abbr title="Space Heating Demand (kWh/m²·year)">SHD</abbr>
                    </div>
                </div>

                {scenarios.map(({ id, title, isBaseline }) => {
                    const scenario = getScenario(assessment, id);

                    return (
                        <ScenarioBlock
                            assessment={assessment}
                            active={expandedScenario === id}
                            id={id}
                            key={`sidebar-block-sc${id}`}
                            title={title}
                            isBaseline={isBaseline}
                            createdFromName={getCreatedFromName(scenario.created_from)}
                            createdFromChanges={getCreatedChanges(assessment, scenario)}
                            locked={scenario.locked}
                            shd={scenario.space_heating_demand_m2}
                            setActiveScenario={(show) => {
                                if (show === null) {
                                    setExpandedScenario('');
                                } else {
                                    setExpandedScenario(show);
                                }
                            }}
                        />
                    );
                })}
            </div>

            <div className="side-section">
                <div className="side-section--header">Tools &amp; Settings</div>

                <ul className="list-unstyled">
                    <SidebarLink view="export" text="Import/Export" />
                    <SidebarLink view="librariesmanager" text="Libraries manager" />
                    <SidebarLink view="fuelsmanager" text="Fuels manager" />
                </ul>
            </div>
        </div>
    );
}
