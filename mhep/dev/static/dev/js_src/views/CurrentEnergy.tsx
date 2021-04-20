import React, { useState, ReactElement, useContext } from 'react';
import { NewAssessment } from '../types/Assessment';
import { AppContext } from '../context/AppContext';
import { getScenario } from '../lib/scenarios';

import Tooltip from '../components/Tooltip';
import FormRow from '../components/FormRow';
import Result from '../components/Result';
import TargetBar from '../components/TargetBar';
import NumberField from '../components/NumberField';
import CheckboxField from '../components/CheckboxField';

import targets from '../data/targets';
interface CurrentEnergyProps {
    assessment: NewAssessment;
    scenarioId: string;
}

function CurrentEnergy({ assessment, scenarioId }: CurrentEnergyProps): ReactElement {
    const [fuelToAdd, setFuelToAdd] = useState('');
    const { update } = useContext(AppContext);

    const scenario = getScenario(assessment, scenarioId);

    const fuelNamesInUse = Object.entries(scenario.currentenergy.use_by_fuel).map(
        ([name]) => name
    );

    const availableFuels = Object.entries(scenario.fuels)
        .filter(([, fuel]) => fuel.category !== 'Generation')
        .filter(([name]) => !fuelNamesInUse.includes(name));
    const availableFuelsCategories = [
        ...new Set(availableFuels.map(([, fuel]) => fuel.category)),
    ].sort();

    return (
        <section>
            <p>
                The figures shown below on the left are the totals for actual energy use.
                If the input data is accurate, these figures represent real values.
            </p>
            <p>
                The graphs compare these values against the ones given by the model for
                the baseline scenario. According to the characteristics of the building,
                target temperature, type of fuel, etc. the model calculates the
                theoretical amount of energy needed to run the dwelling.
            </p>
            <p>
                Comparing current energy use against the modelled use can give an idea of
                how well the model represents reality.
            </p>

            <div className="d-flex justify-content-between pb-30">
                <div>
                    <h4>Annual totals</h4>

                    <FormRow>
                        <span>
                            Primary energy consumption
                            <Tooltip>
                                Takes into account energy from all the different sources
                                (gas, electricity grid, etc. including the fraction used
                                onsite from renewable generation) minus the total savings
                                due to generation
                            </Tooltip>
                        </span>
                        <Result
                            val={scenario.currentenergy.primaryenergy_annual_kwh}
                            dp={0}
                            units={'kWh'}
                        />
                    </FormRow>
                    <FormRow>
                        <span>Primary energy consumption per m² floor area</span>
                        <Result
                            val={scenario.currentenergy.primaryenergy_annual_kwhm2}
                            dp={0}
                            units={'kWh/m²'}
                        />
                    </FormRow>
                    <FormRow>
                        <span>
                            CO<sub>2</sub> emissions
                            <Tooltip>
                                Takes into account CO2 from all the different sources
                                (gas, electricity grid, etc. including the fraction used
                                onsite from renewable generation) minus the total savings
                                due to generation
                            </Tooltip>
                        </span>
                        <Result
                            val={scenario.currentenergy.total_co2}
                            dp={0}
                            units={'kg'}
                        />
                    </FormRow>
                    <FormRow>
                        <span>
                            CO<sub>2</sub> emissions per m² floor area
                        </span>
                        <Result
                            val={scenario.currentenergy.total_co2m2}
                            dp={0}
                            units={
                                <span>
                                    kgCO<sub>2</sub>/m²
                                </span>
                            }
                        />
                    </FormRow>
                    <FormRow>
                        <span>Energy cost from bills</span>
                        <Result
                            val={scenario.currentenergy.total_cost}
                            dp={0}
                            units={'£'}
                            unitsBefore
                        />
                    </FormRow>
                    <FormRow>
                        <span>Net energy cost, including FIT income</span>
                        <Result
                            val={scenario.currentenergy.annual_net_cost}
                            dp={0}
                            units={'£'}
                            unitsBefore
                        />
                    </FormRow>
                </div>

                <div id="targetbars">
                    <h4>Comparison charts</h4>
                    <p>
                        Top/lighter = from data provided on this page
                        <br />
                        Bottom/darker = from the modelled baseline
                    </p>

                    <TargetBar
                        name="Primary energy demand"
                        width={424.5}
                        value={[
                            scenario.currentenergy.primaryenergy_annual_kwhm2,
                            scenario.primary_energy_use_m2,
                        ]}
                        units="kWh/m²"
                        targets={targets.primary_energy_demand}
                    />

                    <TargetBar
                        name="CO₂ emission rate"
                        width={424.5}
                        value={[scenario.currentenergy.total_co2m2, scenario.kgco2perm2]}
                        units="kgCO₂/m²"
                        targets={targets.co2_per_m2}
                    />

                    <TargetBar
                        name="Per person energy use"
                        width={424.5}
                        value={[
                            scenario.currentenergy.energyuseperperson,
                            scenario.kwhdpp,
                        ]}
                        units="kWh/day"
                        targets={targets.energy_use_per_person}
                    />
                </div>
            </div>

            <h4>Fuel use</h4>

            <table className="table mb-7">
                {fuelNamesInUse.length > 0 && (
                    <thead style={{ backgroundColor: 'var(--brown-4)' }}>
                        <tr>
                            <th style={{ width: 100 }}></th>
                            <th>
                                Annual use
                                <br />
                                kWh
                            </th>
                            <th>
                                CO<sub>2</sub> factor
                                <br />
                                kgCO<sub>2</sub>/kWh
                            </th>
                            <th>
                                Annual kgCO<sub>2</sub>
                            </th>
                            <th>Primary energy factor</th>
                            <th>
                                Primary energy
                                <br />
                                kWh
                            </th>
                            <th>
                                Unit cost
                                <br />
                                p/kWh
                            </th>
                            <th>Annual standing charge</th>
                            <th>Annual cost</th>
                            <th></th>
                        </tr>
                    </thead>
                )}

                <tbody>
                    {Object.entries(scenario.currentenergy.use_by_fuel).map(
                        ([name, fuel], i) => (
                            <tr key={i}>
                                <td>
                                    <label htmlFor={`field_${name}`}>{name}</label>
                                </td>
                                <td>
                                    <NumberField
                                        id={name}
                                        value={fuel.annual_use}
                                        setValue={(val) => (fuel.annual_use = val)}
                                    />
                                </td>
                                <td>
                                    <Result
                                        val={scenario.fuels[name].co2factor}
                                        units="× "
                                        unitsBefore
                                    />
                                </td>
                                <td>
                                    <Result val={fuel.annual_co2} />
                                </td>
                                <td>
                                    <Result
                                        val={scenario.fuels[name].primaryenergyfactor}
                                        units="× "
                                        unitsBefore
                                    />
                                </td>
                                <td>
                                    <Result val={fuel.primaryenergy} dp={2} />
                                </td>
                                <td>
                                    <Result val={scenario.fuels[name].fuelcost} />
                                </td>
                                <td>
                                    <Result
                                        val={scenario.fuels[name].standingcharge}
                                        units="£"
                                        unitsBefore
                                    />
                                </td>
                                <td>
                                    <Result
                                        val={fuel.annualcost}
                                        units={'£'}
                                        unitsBefore
                                    />
                                </td>
                                <td>
                                    <button
                                        className="btn"
                                        onClick={() => {
                                            delete scenario.currentenergy.use_by_fuel[
                                                name
                                            ];
                                            update();
                                        }}
                                    >
                                        <i className="currentenergy-delete-fuel icon-trash" />
                                    </button>
                                </td>
                            </tr>
                        )
                    )}
                </tbody>
                <tbody>
                    <tr style={{ backgroundColor: 'var(--brown-4)' }}>
                        <td>
                            <label htmlFor="field_fuel_to_add">Add new fuel</label>
                        </td>
                        <td colSpan={9}>
                            <div className="d-flex" style={{ alignItems: 'baseline' }}>
                                <select
                                    id="field_fuel_to_add"
                                    value={fuelToAdd}
                                    onChange={(evt) => setFuelToAdd(evt.target.value)}
                                    onBlur={(evt) => setFuelToAdd(evt.target.value)}
                                >
                                    <option hidden defaultValue="Select one...">
                                        Select one...
                                    </option>
                                    {availableFuelsCategories.map(
                                        (category: string, i) => (
                                            <optgroup key={i} label={category}>
                                                {availableFuels
                                                    .filter(
                                                        ([, fuels]) =>
                                                            fuels.category === category
                                                    )
                                                    .map(([name], j) => (
                                                        <option key={j} value={name}>
                                                            {name}
                                                        </option>
                                                    ))}
                                            </optgroup>
                                        )
                                    )}
                                </select>

                                <button
                                    className="btn"
                                    onClick={() => {
                                        scenario.currentenergy.use_by_fuel[fuelToAdd] = {
                                            annual_co2: 0,
                                            annual_use: 0,
                                            annualcost: 0,
                                            primaryenergy: 0,
                                        };
                                        update();
                                        setFuelToAdd('');
                                    }}
                                >
                                    Add
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <details className="mb-30">
                <summary>Show conversion factors</summary>

                <table className="table mb-15" style={{ width: 'auto' }}>
                    <thead style={{ backgroundColor: 'var(--brown-4)' }}>
                        <tr>
                            <th>Name</th>
                            <th>Unit</th>
                            <th>Equivalent energy</th>
                            <th style={{ width: '40ch' }}>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Wood logs</td>
                            <td>1m3</td>
                            <td className="text-right tabular-nums">1380 kWh</td>
                            <td>Assumes stacked measure, with gaps</td>
                        </tr>
                        <tr>
                            <td>Wood pellets</td>
                            <td>1m3</td>
                            <td className="text-right tabular-nums">4230 kWh</td>
                            <td></td>
                        </tr>
                        <tr>
                            <td rowSpan={2}>Mains gas</td>
                            <td>1m3</td>
                            <td className="text-right tabular-nums">11.18 kWh</td>
                            <td rowSpan={2}>
                                Calorific value of mains gas varies over time and by
                                region. You can check against current figures, or use this
                                as an approximation.
                            </td>
                        </tr>
                        <tr>
                            <td>1ft3</td>
                            <td className="text-right tabular-nums">31.70 kWh</td>
                        </tr>
                        <tr>
                            <td>Oil</td>
                            <td>1L</td>
                            <td className="text-right tabular-nums">10.35 kWh</td>
                            <td></td>
                        </tr>
                        <tr>
                            <td rowSpan={2}>Bottled gas (LPG)</td>
                            <td>1L</td>
                            <td className="text-right tabular-nums">7.11 kWh</td>
                            <td></td>
                        </tr>
                        <tr>
                            <td>1kg</td>
                            <td className="text-right tabular-nums">13.89 kWh</td>
                            <td></td>
                        </tr>
                        <tr>
                            <td>Coal</td>
                            <td>1kg</td>
                            <td className="text-right tabular-nums">8.34 kWh</td>
                            <td></td>
                        </tr>
                        <tr>
                            <td>Smokeless fuel</td>
                            <td>1kg</td>
                            <td className="text-right tabular-nums">8.90 kWh</td>
                            <td></td>
                        </tr>
                        <tr>
                            <td>Anthracite</td>
                            <td>1kg</td>
                            <td className="text-right tabular-nums">9.66 kWh</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </details>

            <h4>Generation</h4>

            <div className="d-flex" style={{ alignItems: 'baseline' }}>
                <CheckboxField
                    id="onsite_generation"
                    value={scenario.currentenergy.onsite_generation}
                    setValue={(val) => (scenario.currentenergy.onsite_generation = val)}
                />
                <label htmlFor="field_onsite_generation" style={{ marginLeft: 10 }}>
                    Has on-site generation
                </label>
            </div>

            {scenario.currentenergy.onsite_generation && (
                <table className="table">
                    <thead style={{ backgroundColor: '#f0f0f0' }}>
                        <tr>
                            <th>
                                <label htmlFor={`field_annual_generation`}>
                                    <b>
                                        Annual generation
                                        <br />
                                        kWh{' '}
                                    </b>
                                </label>
                            </th>
                            <th>
                                CO<sub>2</sub> factor
                                <br />
                                kgCO<sub>2</sub>/kWh
                            </th>
                            <th>
                                Annual kgCO<sub>2</sub> saved
                                <Tooltip>
                                    Due to total generation: includes energy used on-site
                                    and exported
                                </Tooltip>
                            </th>
                            <th>Primary energy factor</th>
                            <th>
                                Primary energy saved <br />
                                kWh
                                <Tooltip>
                                    Due to total generation: includes energy used on-site
                                    and exported
                                </Tooltip>
                            </th>
                            <th>
                                Unit cost
                                <br /> p/kWh
                            </th>
                            <th>
                                <label htmlFor={`field_fration_used_onsite`}>
                                    <b>Fraction used on-site</b>
                                </label>
                            </th>
                            <th>
                                Annual savings
                                <Tooltip>
                                    Due to energy used on-site. This amount would be part
                                    of your bills if you did not have generation
                                </Tooltip>
                            </th>
                            <th>
                                <label htmlFor={`field_FIT_annual_income`}>
                                    <b>FIT annual income £</b>
                                </label>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <NumberField
                                    id="annual_generation"
                                    value={
                                        scenario.currentenergy.generation
                                            .annual_generation
                                    }
                                    setValue={(val) =>
                                        (scenario.currentenergy.generation.annual_generation = val)
                                    }
                                />
                            </td>

                            <td>
                                <Result
                                    val={scenario.fuels['generation'].co2factor}
                                    units={'× '}
                                    unitsBefore
                                />
                            </td>
                            <td>
                                <Result
                                    val={scenario.currentenergy.generation.annual_CO2}
                                />
                            </td>
                            <td>
                                <Result
                                    val={scenario.fuels['generation'].primaryenergyfactor}
                                    units={'× '}
                                    unitsBefore
                                />
                            </td>
                            <td>
                                <Result
                                    val={scenario.currentenergy.generation.primaryenergy}
                                    dp={2}
                                />
                            </td>
                            <td>
                                <Result val={scenario.fuels['generation'].fuelcost} />
                            </td>
                            <td>
                                <NumberField
                                    id="fration_used_onsite"
                                    value={
                                        scenario.currentenergy.generation
                                            .fraction_used_onsite
                                    }
                                    setValue={(val) =>
                                        (scenario.currentenergy.generation.fraction_used_onsite = val)
                                    }
                                />
                            </td>
                            <td>
                                <Result
                                    val={scenario.currentenergy.generation.annual_savings}
                                    units={'£'}
                                    unitsBefore
                                />
                            </td>
                            <td>
                                <NumberField
                                    id="FIT_annual_income"
                                    value={
                                        scenario.currentenergy.generation
                                            .annual_FIT_income
                                    }
                                    setValue={(val) =>
                                        (scenario.currentenergy.generation.annual_FIT_income = val)
                                    }
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            )}
        </section>
    );
}

export default CurrentEnergy;
