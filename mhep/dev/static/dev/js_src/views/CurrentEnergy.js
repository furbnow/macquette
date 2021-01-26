import React, { useState } from 'react'

import FormRow from '../components/FormRow'
import Result from '../components/Result'
import TargetBar from '../components/TargetBar'
import NumberField from '../components/NumberField'
import CheckboxField from '../components/CheckboxField'

import targets from '../data/targets'

function CurrentEnergy({ scenario }) {
    const allFuels = scenario.currentEnergy.getAllFuelsList()
    const fuelsInUse = scenario.currentEnergy.getFuelsInUseList()

    let availableFuels = [...allFuels].filter(fuel => fuel.category !== 'Generation')
    fuelsInUse.forEach(fuelInUse =>
        availableFuels = availableFuels.filter(availableFuel => !availableFuel.name.includes(fuelInUse.name))
    );
    // ^ - ugly - simpler way?
    const availableFuelsCategories = [...new Set(availableFuels.map(fuel => fuel.category))].sort();

    const [fuelToAdd, setFuelToAdd] = useState('')

    function doAddFuelInUse() {
        scenario.currentEnergy.addFuelInUse(fuelToAdd)
        setFuelToAdd('')
    }

    return (
        <div>
            <div id="header">
                <hr /><h3>Current Energy Use</h3><hr />
                <br />
                <p>The figures shown below are the totals for your actual energy use. If the input data is accurate, these figures represent real values.</p>
                <p>The figures shown in the overview above are the result of running your house through the model. According to the characteristics of the building, your target temperature, your type of fuel, etc. the model calculates the theoretical amount of energy you need to run your house.</p>
                <p>Comparing your Current Energy figures against the model ones can give an idea of how well the model represents your specific situation.</p>
                <br />
            </div>

            <div id="totals">
                <b>Annual totals:</b>
                <div className="d-flex align-items-center justify-content-between pb-30">
                    <div>
                        <FormRow>
                            <span>Primary energy consumption <i className="icon-question-sign" title="Takes into account energy from all the different sources (gas, electricity grid, etc. including the fraction used onsite from renewable generation) minus the total savings due to generation" />
                            </span>
                            <Result
                                val={scenario.currentEnergy.primaryenergy_annual_kwh}
                                dp={0}
                                units={'kWh'}
                            />
                        </FormRow>
                        <FormRow>
                            <span>CO<sub>2</sub> emissions <i className="icon-question-sign" title="Takes into account CO2 from all the different sources (gas, electricity grid, etc. including the fraction used onsite from renewable generation) minus the total savings due to generation" />
                            </span>
                            <Result
                                val={scenario.currentEnergy.total_co2}
                                dp={0}
                                units={'kg'}
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
                        <FormRow>
                            <span>Primary energy consumption per m² floor area:</span>
                            <Result
                                val={scenario.currentEnergy.primaryenergy_annual_kwhm2}
                                dp={0}
                                units={'kWh/m²'}
                            />
                        </FormRow>
                        {/* !!! - styling issue */}
                        <FormRow>
                            <span>Total CO<sub>2</sub> emissions per m² floor area:</span>
                            <Result
                                val={scenario.currentEnergy.total_co2m2}
                                dp={0}
                                units={<span>kgCO<sub>2</sub>/m²</span>}
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
            </div>

            <div id="fuel-use">
                <table className="table" style={{ backgroundColor: '#f0f0f0' }}>
                    <tr>
                        <th style={{ width: 100 }}></th>
                        <th>Annual use<br />kWh <i className="icon-question-sign"
                            title="Conversion factors:
                                   - Wood Logs*: 1m3 = 1380 kWh
                                   - Wood Pellets: 1m3 = 4230 kWh
                                   - Mains gas**: 1m3 = 11.18 kWh
                                   - Mains gas**: 1ft3 = 31.7 kWh
                                   - Oil: 1L = 10.35 kWh
                                   - Bottled gas (LPG): 1L = 7.11kWh
                                   - Bottled gas (LPG): 1kg = 13.89kWh
                                   - Coal: 1kg = 8.34kWh
                                   - Smokeless fuel: 1kg = 8.9kWh
                                   - Anthracite: 1kg = 9.66kWh

                                   * Assumes stacked measure, with gaps
                                   ** Note, calorific value of mains gas does vary over time and by region - you can check against current figures, or use this as an approximation">
                        </i></th>
                        <th>CO<sub>2</sub> factor<br />kgCO<sub>2</sub>/kWh</th>
                        <th>Annual kgCO<sub>2</sub></th>
                        <th>Primary energy factor</th>
                        <th>Primary energy<br />kWh</th>
                        <th>Unit cost<br />p/kWh</th>
                        <th>Annual standing charge</th>
                        <th>Annual cost</th>
                        <th></th>
                    </tr>

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
                                        val={(allFuels.filter(f => f.name === fuel.name)[0])['co2factor']}
                                        units={'× '}
                                        unitsBefore
                                    />
                                </td>
                                <td><Result val={fuel.annual_co2} /></td>
                                <td>
                                    <Result
                                        val={(allFuels.filter(f => f.name === fuel.name)[0])['primaryenergyfactor']}
                                        units={'× '}
                                        unitsBefore
                                    />
                                </td>
                                <td><Result val={fuel.primaryenergy} dp={2} /></td>
                                <td><Result val={(allFuels.filter(f => f.name === fuel.name)[0])['fuelcost']} /></td>
                                <td>
                                    <Result
                                        val={(allFuels.filter(f => f.name === fuel.name)[0])['standingcharge']}
                                        units={'£'}
                                        unitsBefore
                                    />
                                </td>
                                <td><Result val={fuel.annualcost} units={'£'} unitsBefore /></td>
                                <td>
                                    <button
                                        style={{ border: 'none' }}
                                        onClick={() => scenario.currentEnergy.deleteFuelInUse(fuel.name)}
                                    >
                                        <i className='currentenergy-delete-fuel icon-trash'
                                            style={{ cursor: 'pointer' }}>
                                        </i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div id="add-fuel-in-use" className="input-prepend input-append">
                <span className="add-on">
                    <label htmlFor="field_fuel_to_add">Type of fuel</label>
                </span>
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
                    onClick={() => doAddFuelInUse()}
                >Add
                </button>
            </div>

            <div id="onsite-generation">
                {/* not a form row? - reduce padding between checkbox and label? */}
                <FormRow>
                    <label htmlFor="field_onsite_generation">Is there any on-site generation?</label>
                    <CheckboxField
                        id="onsite_generation"
                        value={scenario.currentEnergy.onsite_generation}
                        setValue={(val) => (scenario.currentEnergy.onsite_generation = val)}
                    />
                </FormRow>

                {scenario.currentEnergy.onsite_generation &&
                    <table className="table" style={{ backgroundColor: '#f0f0f0' }}>
                        <tr>
                            <th><label htmlFor={`field_annual_generation`}><b>Annual generation<br />kWh </b></label></th>
                            <th>CO<sub>2</sub> factor<br />kgCO<sub>2</sub>/kWh</th>
                            <th>Annual kgCO<sub>2</sub> saved <i className="icon-question-sign" title="Due to total generation: includes energy used on-site and exported" ></i></th>
                            <th>Primary energy factor</th>
                            <th>Primary energy saved <br />kWh <i className="icon-question-sign" title="Due to total generation: includes energy used on-site and exported" ></i></th>
                            <th>Unit cost<br /> p/kWh</th>
                            <th><label htmlFor={`field_fration_used_onsite`}><b>Fraction used on-site</b></label></th>
                            <th>Annual savings <i className="icon-question-sign" title="Due to energy used on-site. This amount would be part of your bills if you did not have generation." ></i></th>
                            <th><label htmlFor={`field_FIT_annual_income`}><b>FIT annual income £</b></label></th>
                        </tr>
                        <tbody>
                            <tr>
                                <td>
                                    <NumberField
                                        id="annual_generation"
                                        value={scenario.currentEnergy.annual_generation}
                                        setValue={(val) => (scenario.currentEnergy.annual_generation = val)}
                                        className="input-mini"
                                    />
                                </td>

                                <td>
                                    <Result
                                        val={(allFuels.filter(f => f.name === 'generation')[0])['co2factor']}
                                        units={'× '}
                                        unitsBefore
                                    />
                                </td>
                                <td><Result val={scenario.currentEnergy.annual_CO2} /></td>
                                <td>
                                    <Result
                                        val={(allFuels.filter(f => f.name === 'generation')[0])['primaryenergyfactor']}
                                        units={'× '}
                                        unitsBefore
                                    />
                                </td>
                                <td><Result val={scenario.currentEnergy.primaryenergy} dp={2} /></td>
                                <td><Result val={(allFuels.filter(f => f.name === 'generation')[0])['fuelcost']} /></td>
                                <td>
                                    <NumberField
                                        id="fration_used_onsite"
                                        value={scenario.currentEnergy.fraction_used_onsite}
                                        setValue={(val) => (scenario.currentEnergy.fraction_used_onsite = val)}
                                        className="input-mini"
                                    />
                                </td>
                                <td><Result val={scenario.currentEnergy.annual_savings} units={'£'} unitsBefore /></td>
                                <td>
                                    <NumberField
                                        id="FIT_annual_income"
                                        value={scenario.currentEnergy.annual_FIT_income}
                                        setValue={(val) => (scenario.currentEnergy.annual_FIT_income = val)}
                                        className="input-mini"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                }
            </div >
        </div>
    )
}

export default CurrentEnergy
