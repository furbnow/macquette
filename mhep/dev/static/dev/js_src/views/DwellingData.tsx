import React, { useContext, ReactElement } from 'react';
import { AppContext } from '../context/AppContext';

import { NewAssessment } from '../types/Assessment';
import { getScenario } from '../lib/scenarios';
import { deleteFloor, addFloor } from '../lib/dwellingdata';

import FormRow from '../components/FormRow';
import TextField from '../components/TextField';
import NumberField from '../components/NumberField';
import Result from '../components/Result';
import OnOffToggleButton from '../components/OnOffToggleButton';
import Tooltip from '../components/Tooltip';

interface DwellingDataProps {
    assessment: NewAssessment;
    scenarioId: string;
}

function DwellingData({ assessment, scenarioId }: DwellingDataProps): ReactElement {
    const { update } = useContext(AppContext);
    const scenario = getScenario(assessment, scenarioId);

    return (
        <section>
            <h3 className="line-top mt-0">Dwelling Data</h3>
            <FormRow>
                <label htmlFor="field_scenario_name">Scenario name</label>
                <TextField
                    id="scenario_name"
                    value={scenario.scenario_name}
                    setValue={(val) => (scenario.scenario_name = val)}
                />
            </FormRow>

            <h4>Building dimensions</h4>

            <table className="table" style={{ width: 'auto' }}>
                <thead style={{ backgroundColor: 'var(--brown-4)' }}>
                    <tr>
                        <th className="text-left">Name</th>
                        <th>Area</th>
                        <th></th>
                        <th>Storey height</th>
                        <th></th>
                        <th>Volume</th>
                        <th></th>
                    </tr>
                </thead>

                <tbody>
                    {scenario.floors.map((floor, idx) => (
                        <tr key={idx}>
                            <td>
                                <TextField
                                    id="name"
                                    value={floor.name}
                                    setValue={(val) => (floor.name = val)}
                                />
                            </td>
                            <td>
                                <NumberField
                                    id="area"
                                    value={floor.area}
                                    setValue={(val) => (floor.area = val)}
                                    units="m²"
                                />
                            </td>
                            <td>✕</td>
                            <td>
                                <NumberField
                                    id="height"
                                    value={floor.height}
                                    setValue={(val) => (floor.height = val)}
                                    units="m"
                                />
                            </td>
                            <td>=</td>
                            <td>
                                <Result val={floor.volume} units="m³" dp={1} />
                            </td>
                            <td>
                                <button
                                    className="btn"
                                    onClick={() => {
                                        deleteFloor(scenario, idx);
                                        update();
                                    }}
                                >
                                    <i className="icon-trash"></i> Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>

                <tfoot>
                    <tr>
                        <td colSpan={7}>
                            <button
                                className="btn mb-0"
                                onClick={() => {
                                    addFloor(scenario);
                                    update();
                                }}
                            >
                                <i className="icon-plus"></i> Add new floor
                            </button>
                        </td>
                    </tr>

                    <tr style={{ backgroundColor: 'var(--brown-4)' }}>
                        <th>Totals</th>
                        <td>
                            <Result val={scenario.TFA} units="m²" dp={1} />
                        </td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td>
                            <Result val={scenario.volume} units="m³" dp={1} />
                        </td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>

            <h4>Occupancy</h4>

            <FormRow>
                {!scenario.use_custom_occupancy ? (
                    <>
                        <label htmlFor="field_occupancy">
                            Occupancy according to SAP
                            <Tooltip>Based on floor area</Tooltip>
                        </label>
                        <Result val={scenario.occupancy_SAP_value} dp={1} />
                    </>
                ) : (
                    <>
                        <label htmlFor="field_occupancy">Custom occupancy</label>
                        <NumberField
                            id="occupancy"
                            value={scenario.custom_occupancy}
                            setValue={(val) => (scenario.custom_occupancy = val)}
                        />
                    </>
                )}
                <OnOffToggleButton
                    onTitle={`Use SAP value (${scenario.occupancy_SAP_value.toFixed(1)})`}
                    offTitle="Override"
                    value={scenario.use_custom_occupancy}
                    setValue={(val) => (scenario.use_custom_occupancy = val)}
                />
            </FormRow>
        </section>
    );
}

export default DwellingData;
