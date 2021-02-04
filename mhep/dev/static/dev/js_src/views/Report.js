import React, { useState } from 'react';

import useListState from '../hooks/useListState';

import FormRow from '../components/FormRow';
import TextField from '../components/TextField';

export default function Report({ assessment, template }) {
    let scenarioList = assessment.getScenarioList();
    let initial = scenarioList
        .filter((scenario) => scenario.num < 4 && scenario.num > 0)
        .map((scenario) => scenario.id);

    let [reportGenerated, setReportGenerated] = useState(false);
    let [includedScenarios, setIncludedScenarios] = useListState(initial);

    let baseline = scenarioList[0];
    let scenarios = scenarioList.filter((scenario) => scenario.num > 0);

    return (
        <section>
            <FormRow narrow>
                <label htmlFor="field_date">Report date (dd/mm/yyyy):</label>
                <TextField
                    id="date"
                    value={assessment.report.date}
                    setValue={(val) => (assessment.report.date = val)}
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_version">Report version:</label>
                <TextField
                    id="version"
                    value={assessment.report.version}
                    setValue={(val) => (assessment.report.version = val)}
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
                            <label className="d-i ml-7 tabular-nums" htmlFor={`check-${scenario.id}`}>
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
                        let iframe = document.getElementById('report-iframe');
                        setReportGenerated(true);
                        /*global report_show*/
                        report_show(
                            iframe.contentDocument.querySelector('body'),
                            template,
                            includedScenarios
                        );
                    }}
                >
                    Generate
                </button>
                <button
                    className="btn"
                    onClick={() => {
                        document.getElementById('report-iframe').contentWindow.focus();
                        document.getElementById('report-iframe').contentWindow.print();
                    }}
                >
                    Print
                </button>
            </div>

            <div style={{ display: reportGenerated ? 'block' : 'none' }}>
                <span className="small-caps">Report preview</span>
                <iframe
                    title="Report"
                    id="report-iframe"
                    className="report-frame-body"
                    style={{ width: '100%', height: '90vh', border: '2px solid black' }}
                ></iframe>
            </div>
        </section>
    );
}
