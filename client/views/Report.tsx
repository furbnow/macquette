import React, { ReactElement, useState, useRef } from 'react';

import { NewAssessment } from '../types/Assessment';

import useListState from '../hooks/useListState';

import { getScenarioList } from '../lib/scenarios';

import FormRow from '../components/FormRow';
import TextField from '../components/TextField';

declare function report_show(
    greeting: HTMLElement,
    template: string,
    included: string[]
): void;

interface ReportProps {
    assessment: NewAssessment;
    template: string;
}

export default function Report({ assessment, template }: ReportProps): ReactElement {
    const iframe = useRef<HTMLIFrameElement>(null);

    const scenarioList = getScenarioList(assessment);
    const initial = scenarioList
        .filter((scenario) => scenario.num < 4 && scenario.num > 0)
        .map((scenario) => scenario.id);

    const [reportGenerated, setReportGenerated] = useState(false);
    const [includedScenarios, setIncludedScenarios] = useListState(initial);

    const baseline = scenarioList[0];
    const scenarios = scenarioList.filter((scenario) => scenario.num > 0);

    return (
        <section>
            <FormRow narrow>
                <label htmlFor="field_date">Report date (dd/mm/yyyy):</label>
                <TextField
                    id="date"
                    value={assessment._report.date}
                    setValue={(val) => (assessment._report.date = val)}
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_version">Report version:</label>
                <TextField
                    id="version"
                    value={assessment._report.version}
                    setValue={(val) => (assessment._report.version = val)}
                />
            </FormRow>

            <FormRow narrow>
                <span>Show scenarios:</span>
                <ul className="list-unstyled">
                    <li>
                        <input
                            type="checkbox"
                            checked={true}
                            disabled={true}
                            className="big-checkbox"
                            id="check-${scenarioId}"
                        />
                        <label className="d-i ml-7" htmlFor={baseline.id}>
                            {baseline.title}
                        </label>
                    </li>

                    {scenarios.map((scenario) => (
                        <li key={scenario.num}>
                            <input
                                id={`check-${scenario.id}`}
                                type="checkbox"
                                checked={includedScenarios.includes(scenario.id)}
                                onChange={(evt) =>
                                    setIncludedScenarios(scenario.id, evt.target.checked)
                                }
                                className="big-checkbox"
                            />
                            <label
                                className="d-i ml-7 tabular-nums"
                                htmlFor={`check-${scenario.id}`}
                            >
                                Scenario {scenario.num}: {scenario.title}
                            </label>
                        </li>
                    ))}
                </ul>
            </FormRow>

            <div className="mt-15 mb-15">
                <button
                    className="btn mr-15"
                    onClick={() => {
                        if (
                            !iframe ||
                            !iframe.current ||
                            !iframe.current.contentDocument
                        ) {
                            throw new Error('Error R001 generating report');
                        }

                        const body = iframe.current.contentDocument.querySelector('body');
                        if (!body) {
                            throw new Error('Error R003 generating report');
                        }

                        setReportGenerated(true);
                        report_show(body, template, includedScenarios);
                    }}
                >
                    Generate
                </button>
                <button
                    className="btn"
                    onClick={() => {
                        if (!iframe || !iframe.current || !iframe.current.contentWindow) {
                            throw new Error('Error R002 printing report');
                        }

                        iframe.current.contentWindow.focus();
                        iframe.current.contentWindow.print();
                    }}
                >
                    Print
                </button>
            </div>

            <div style={{ display: reportGenerated ? 'block' : 'none' }}>
                <span className="small-caps">Report preview</span>
                <iframe
                    ref={iframe}
                    title="Report"
                    id="report-iframe"
                    className="report-frame-body"
                    style={{ width: '100%', height: '90vh', border: '2px solid black' }}
                ></iframe>
            </div>
        </section>
    );
}
