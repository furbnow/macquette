import React, { useState } from 'react'

import Tooltip from '../components/Tooltip'
import FormRow from '../components/FormRow'
import Result from '../components/Result'
import TargetBar from '../components/TargetBar'
import NumberField from '../components/NumberField'
import CheckboxField from '../components/CheckboxField'

import targets from '../data/targets'


//remove ":" from formrows

function CurrentEnergy({ scenario }) {
    const [fuelToAdd, setFuelToAdd] = useState('')

    const fuelsInUse = scenario.currentEnergy.getFuelsInUseList();
    const fuelNamesInUse = fuelsInUse.map(fuel => fuel.name);
    const allFuels = scenario.currentEnergy.getAllFuelsList();
    const availableFuels = allFuels
        .filter(fuel => fuel.category !== 'Generation')
        .filter(fuel => !fuelNamesInUse.includes(fuel.name));
    const availableFuelsCategories = [...new Set(availableFuels.map(fuel => fuel.category))].sort();

    const getFuel = (name) => allFuels.find(fuel => fuel.name === name);

    return (
        <section>
            <h3 className="line-top mt-0">Current Energy Use</h3>

            <p>The figures shown below are the totals for your actual energy use. If the input data is accurate, these figures represent real values.</p>
            <p>The figures shown in the overview above are the result of running your house through the model. According to the characteristics of the building, your target temperature, your type of fuel, etc. the model calculates the theoretical amount of energy you need to run your house.</p>
            <p>Comparing your Current Energy figures against the model ones can give an idea of how well the model represents your specific situation.</p>

            <div id="totals" className="d-flex align-items-center justify-content-between pb-30">
                <div>
                    <h4>Annual totals</h4>

                    <FormRow>
                        <span>
                            Primary energy consumption
                            <Tooltip>
                                Takes into account energy from all the different sources
                                (gas, electricity grid, etc. including the fraction used
                                onsite from renewable generation) minus the total
                                savings due to generation
                            </Tooltip>
                        </span>
                        <Result
                            val={scenario.currentEnergy.primaryenergy_annual_kwh}
                            dp={0}
                            units={'kWh'}
                        />
                    </FormRow>
                    <FormRow>
                        <span>Primary energy consumption per m² floor area:</span>
                        <Result
                            val={scenario.currentEnergy.primaryenergy_annual_kwhm2}
                            dp={0}
                            units={'kWh/m²'}
                        />
                    </FormRow>
                    <FormRow>
                        <span>
                            CO<sub>2</sub> emissions
                            <Tooltip>
                                Takes into account CO2 from all the different sources (gas,
                                electricity grid, etc. including the fraction used onsite
                                from renewable generation) minus the total savings
                                due to generation
                            </Tooltip>
                        </span>
                        <Result
                            val={scenario.currentEnergy.total_co2}
                            dp={0}
                            units={'kg'}
                        />
                    </FormRow>
                    <FormRow>
                        <span>CO<sub>2</sub> emissions per m² floor area:</span>
                        <Result
                            val={scenario.currentEnergy.total_co2m2}
                            dp={0}
                            units={<span>kgCO<sub>2</sub>/m²</span>}
                        />
                    </FormRow>
                    <FormRow>
                        <span>Energy cost from bills</span>
                        <Result
                            val={scenario.currentEnergy.total_cost}
                            dp={0}
                            units={'£'}
                            unitsBefore
                        />
                    </FormRow>
                    <FormRow>
                        <span>Net energy cost, including FIT income</span>
                        <Result
                            val={scenario.currentEnergy.annual_net_cost}
                            dp={0}
                            units={'£'}
                            unitsBefore
                        />
                    </FormRow>
                </div>

                <div id="targetbars">
                    <TargetBar
                        name="Primary energy demand"
                        width={424.5}
                        value={scenario.currentEnergy.primaryenergy_annual_kwhm2}
                        units="kWh/m²"
                        targets={targets.primary_energy_demand}
                    />
                    <TargetBar
                        name={<span>CO<sub>2</sub> emission rate</span>}
                        width={424.5}
                        value={scenario.currentEnergy.total_co2m2}
                        units="kgCO₂/m²"
                        targets={targets.co2_per_m2}
                    />
                    <TargetBar
                        name="Per person energy use"
                        width={424.5}
                        value={scenario.currentEnergy.energyuseperperson}
                        units="kWh/day"
                        targets={targets.energy_use_per_person}
                    />
                </div>
            </div>

            <h4>Fuel use</h4>

            <details style={{ cursor: "pointer" }} className="mb-15">
                <summary>See conversion factors</summary>

                <table className="table mb-15" style={{ width: "auto" }}>
                    <thead style={{ backgroundColor: 'var(--brown-4)' }}>
                        <tr>
                            <th>Name</th>
                            <th>Unit</th>
                            <th>Equivalent energy</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Wood Logs*</td>
                            <td>1m3</td>
                            <td>1380 kWh</td>
                        </tr>
                        <tr>
                            <td>Wood Pellets</td>
                            <td>1m3</td>
                            <td>4230 kWh</td>
                        </tr>
                        <tr>
                            <td>Mains gas**</td>
                            <td>1m3</td>
                            <td>11.18 kWh</td>
                        </tr>
                        <tr>
                            <td>Mains gas**</td>
                            <td>1ft3</td>
                            <td>31.7 kWh</td>
                        </tr>
                        <tr>
                            <td>Oil</td>
                            <td>1L</td>
                            <td>10.35 kWh</td>
                        </tr>
                        <tr>
                            <td>Bottled gas (LPG)</td>
                            <td>1L</td>
                            <td>7.11kWh</td>
                        </tr>
                        <tr>
                            <td>Bottled gas (LPG)</td>
                            <td>1kg</td>
                            <td>13.89kWh</td>
                        </tr>
                        <tr>
                            <td>Coal</td>
                            <td>1kg</td>
                            <td>8.34kWh</td>
                        </tr>
                        <tr>
                            <td>Smokeless fuel</td>
                            <td>1kg</td>
                            <td>8.9kWh</td>
                        </tr>
                        <tr>
                            <td>Anthracite</td>
                            <td>1kg</td>
                            <td>9.66kWh</td>
                        </tr>
                    </tbody>
                </table>

                <p>* Assumes stacked measure, with gaps</p>
                <p>** Calorific value of mains gas varies over time and by region -
                you can check against current figures, or use this as an approximation</p>
            </details>

            <table className="table">
                {fuelsInUse.length > 0 &&
                    <thead style={{ backgroundColor: 'var(--brown-4)' }}>
                        <tr>
                            <th style={{ width: 100 }}></th>
                            <th>Annual use<br />kWh</th>
                            <th>CO<sub>2</sub> factor<br />kgCO<sub>2</sub>/kWh</th>
                            <th>Annual kgCO<sub>2</sub></th>
                            <th>Primary energy factor</th>
                            <th>Primary energy<br />kWh</th>
                            <th>Unit cost<br />p/kWh</th>
                            <th>Annual standing charge</th>
                            <th>Annual cost</th>
                            <th></th>
                        </tr>
                    </thead>
                }

                <tbody>
                    {fuelsInUse.map((fuel, i) => (
                        <tr key={i}>
                            <td><label htmlFor={`field_${fuel.name}`}>{fuel.name}</label></td>
                            <td>
                                <NumberField
                                    id={fuel.name}
                                    value={fuel.annual_use}
                                    setValue={(val) => (fuel.annual_use = val)}
                                    className="input-mini"
                                />
                            </td>
                            <td>
                                <Result
                                    val={getFuel(fuel.name).co2factor}
                                    units='× '
                                    unitsBefore
                                />
                            </td>
                            <td><Result val={fuel.annual_co2} /></td>
                            <td>
                                <Result
                                    val={getFuel(fuel.name).primaryenergyfactor}
                                    units='× '
                                    unitsBefore
                                />
                            </td>
                            <td><Result val={fuel.primaryenergy} dp={2} /></td>
                            <td><Result val={getFuel(fuel.name).fuelcost} /></td>
                            <td>
                                <Result
                                    val={getFuel(fuel.name).standingcharge}
                                    units='£'
                                    unitsBefore
                                />
                            </td>
                            <td><Result val={fuel.annualcost} units={'£'} unitsBefore /></td>
                            <td>
                                <button
                                    className="btn"
                                    onClick={() => scenario.currentEnergy.deleteFuelInUse(fuel.name)}
                                >
                                    <i className='currentenergy-delete-fuel icon-trash' />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tbody>
                    <tr style={{ backgroundColor: 'var(--brown-4)' }}>
                        <td>
                            <label htmlFor="field_fuel_to_add">Add new fuel</label>
                        </td>
                        <td colSpan="9">
                            <div className="d-flex" style={{ alignItems: "baseline" }}>
                                <select
                                    id="field_fuel_to_add"
                                    value={fuelToAdd}
                                    onChange={(evt) => setFuelToAdd(evt.target.value)} //?? - either/or/both?
                                    onBlur={(evt) => setFuelToAdd(evt.target.value)} //?? - either/or/both?
                                >
                                    <option hidden defaultValue>Select one...</option>
                                    {availableFuelsCategories
                                        .map((category, i) =>
                                            <optgroup key={i} label={category}>
                                                {availableFuels
                                                    .filter(fuels => fuels.category === category)
                                                    .map((fuel, j) =>
                                                        <option key={j} value={fuel.name}>{fuel.name}</option>
                                                    )}
                                            </optgroup>
                                        )}
                                </select>

                                <button
                                    className="btn"
                                    onClick={() => {
                                        scenario.currentEnergy.addFuelInUse(fuelToAdd)
                                        setFuelToAdd('')
                                    }}
                                >
                                    Add
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <h4>Generation</h4>

            <div className="d-flex" style={{ alignItems: 'baseline' }}>
                <CheckboxField
                    id="onsite_generation"
                    value={scenario.currentEnergy.onsite_generation}
                    setValue={(val) => (scenario.currentEnergy.onsite_generation = val)}
                />
                <label htmlFor="field_onsite_generation" style={{ marginLeft: 10 }}>Has on-site generation</label>
            </div>

            {scenario.currentEnergy.onsite_generation &&
                <table className="table">
                    <thead style={{ backgroundColor: '#f0f0f0' }}>
                        <tr>
                            <th><label htmlFor={`field_annual_generation`}><b>Annual generation<br />kWh </b></label></th>
                            <th>CO<sub>2</sub> factor<br />kgCO<sub>2</sub>/kWh</th>
                            <th>Annual kgCO<sub>2</sub> saved
                                <Tooltip>
                                    Due to total generation: includes energy used on-site and exported
                                </Tooltip>
                            </th>
                            <th>Primary energy factor</th>
                            <th>Primary energy saved <br />kWh
                                <Tooltip>
                                    Due to total generation: includes energy used on-site and exported
                                </Tooltip>
                            </th>
                            <th>Unit cost<br /> p/kWh</th>
                            <th><label htmlFor={`field_fration_used_onsite`}><b>Fraction used on-site</b></label></th>
                            <th>Annual savings
                                <Tooltip>
                                    Due to energy used on-site. This amount would be part of your bills if you did not have generation
                                </Tooltip>
                            </th>
                            <th><label htmlFor={`field_FIT_annual_income`}><b>FIT annual income £</b></label></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <NumberField
                                    id="annual_generation"
                                    value={scenario.currentEnergy.generation_annual_kwh}
                                    setValue={(val) => (scenario.currentEnergy.generation_annual_kwh = val)}
                                    className="input-mini"
                                />
                            </td>

                            <td>
                                <Result
                                    val={getFuel('generation').co2factor}
                                    units={'× '}
                                    unitsBefore
                                />
                            </td>
                            <td><Result val={scenario.currentEnergy.generation_annual_CO2} /></td>
                            <td>
                                <Result
                                    val={getFuel('generation').primaryenergyfactor}
                                    units={'× '}
                                    unitsBefore
                                />
                            </td>
                            <td><Result val={scenario.currentEnergy.generation_primaryenergy} dp={2} /></td>
                            <td><Result val={getFuel('generation').fuelcost} /></td>
                            <td>
                                <NumberField
                                    id="fration_used_onsite"
                                    value={scenario.currentEnergy.generation_fraction_used_onsite}
                                    setValue={(val) => (scenario.currentEnergy.generation_fraction_used_onsite = val)}
                                    className="input-mini"
                                />
                            </td>
                            <td><Result val={scenario.currentEnergy.generation_annual_savings} units={'£'} unitsBefore /></td>
                            <td>
                                <NumberField
                                    id="FIT_annual_income"
                                    value={scenario.currentEnergy.generation_annual_FIT_income}
                                    setValue={(val) => (scenario.currentEnergy.generation_annual_FIT_income = val)}
                                    className="input-mini"
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            }
        </section>
    )
}

export default CurrentEnergy
