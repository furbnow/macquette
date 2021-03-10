import React from 'react';

import FormRow from '../components/FormRow';
import TextField from '../components/TextField';
import NumberField from '../components/NumberField';
import Result from '../components/Result';
import SelectField from '../components/SelectField';
import Regions from '../data/regions';
import CheckboxField from '../components/CheckboxField'

export default function Context({ scenario }) {
    return (
        <section>
            <h3 className="line-top mt-0">Context</h3>

            <FormRow>
                <label htmlFor="field_scenario_name">Scenario name</label>
                <TextField
                    id="scenario_name"
                    value={scenario.name}
                    setValue={(val) => (scenario.name = val)}
                />
            </FormRow>

            <h4>Building dimensions</h4>

            <table className="table" style={{ width: 'auto' }}>
                <thead style={{ backgroundColor: "var(--brown-4)" }}>
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
                    {scenario.getFloors().map((floor, idx) => (
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
                                    onClick={() => scenario.deleteFloor(idx)}
                                >
                                    <i className="icon-trash"></i> Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>

                <tfoot>
                    <tr>
                        <td colSpan="7">
                            <button className="btn mb-0" onClick={() => scenario.addFloor()}>
                                <i className="icon-plus"></i> Add new floor
                            </button>
                        </td>
                    </tr>

                    <tr style={{ backgroundColor: "var(--brown-4)" }}>
                        <th>Totals</th>
                        <td>
                            <Result val={scenario.totalFloorArea} units="m²" dp="1" />
                        </td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td>
                            <Result
                                val={scenario.totalBuildingVolume}
                                units="m³"
                                dp="1"
                            />
                        </td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>

            <h4>Dwelling Location</h4>

            <FormRow>
                <label htmlFor="field_region">UK region</label>
                <SelectField
                    id="region"
                    options={Regions}
                    value={scenario.region}
                    setValue={(val) => (scenario.region = val)}
                />
            </FormRow>

            <FormRow>
                <label htmlFor="field_altitude">Altitude
                <br />
                    <a style={{ fontSize: 12 }} href="https://www.daftlogic.com/sandbox-google-maps-find-altitude.htm" target="blank">(find it here)</a>
                </label>
                <NumberField
                    id="height"
                    units="m"
                    value={scenario.altitude}
                    setValue={(val) => (scenario.altitude = val)}
                />
            </FormRow>

            <h4>Occupancy</h4>

            <FormRow>
                <span>SAP Occupancy based on floor area</span>
                <Result
                    val={scenario.occupancy}
                    dp="1"
                />
            </FormRow>

            <FormRow>
                <label htmlFor="field_use_custom_occupancy">Use custom occupancy figure?</label>
                <CheckboxField
                    id="use_custom_occupancy"
                    value={scenario.use_custom_occupancy}
                    setValue={(val) => (scenario.use_custom_occupancy = val)}
                />
            </FormRow>

            <FormRow>
                <label htmlFor="field_custom_occupancy">Custom occupancy</label>
                <NumberField
                    disabled={!scenario.use_custom_occupancy}
                    id="custom_occupancy"
                    value={scenario.custom_occupancy}
                    setValue={(val) => (scenario.custom_occupancy = val)}
                />
            </FormRow>


        </section>
    );
}
