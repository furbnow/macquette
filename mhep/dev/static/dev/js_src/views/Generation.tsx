import React, { useState, useContext, ReactElement } from 'react';

import { AppContext } from '../context/AppContext';
import { NewAssessment } from '../types/Assessment';
import { getScenario, scenarioIsBaseline } from '../lib/scenarios';

import CheckboxField from '../components/CheckboxField';
import FormRow from '../components/FormRow';
import NumberField from '../components/NumberField';
import Result from '../components/Result';
import SelectField from '../components/SelectField';
import { GenerationMeasuresLibrary } from '../types/Library';

interface GenerationProps {
    assessment: NewAssessment;
    scenarioId: string;
}

interface GenerationMeasureSelectorProps {
    onSelect: (tag: string, measure: GenerationMeasuresLibrary) => void;
}

const GenerationMeasureSelector = ({
    onSelect,
}: GenerationMeasureSelectorProps): ReactElement => {
    const { libraries } = useContext(AppContext);

    const [generationLibs] = useState(
        libraries.filter<GenerationMeasuresLibrary>(
            (lib): lib is GenerationMeasuresLibrary => lib.type === 'generation_measures'
        )
    );
    const [selectedLibIdx, setSelectedLibIdx] = useState(0);
    const selectedLib = generationLibs[selectedLibIdx];
    const [selectedItemTag, setSelectedItemTag] = useState(
        Object.keys(selectedLib.data)[0]
    );
    const selectedItem = selectedLib.data[selectedItemTag];

    const headings = [
        { value: selectedItemTag, title: 'Tag' },
        { value: selectedItem.name, title: 'Name' },
        { value: selectedItem.description, title: 'Description' },
        { value: `${selectedItem.kWp} kWp`, title: 'Peak power' },
        { value: selectedItem.performance, title: 'Performance' },
        { value: selectedItem.benefits, title: 'Benefits' },
        { value: `£${selectedItem.cost} per ${selectedItem.cost_units}`, title: 'Cost' },
        { value: selectedItem.who_by, title: 'Who by' },
        { value: selectedItem.disruption, title: 'Disruption' },
        { value: selectedItem.associated_work, title: 'Associated work' },
        { value: selectedItem.key_risks, title: 'Key risks' },
        { value: selectedItem.notes, title: 'Notes' },
        { value: selectedItem.maintenance, title: 'Maintenance' },
    ];

    return (
        <>
            <div style={{ paddingTop: 10 }}>
                <SelectField
                    id="library_select"
                    options={generationLibs.map((lib, i) => ({
                        value: i,
                        display: lib.name,
                    }))}
                    value={selectedLibIdx}
                    setValue={(idx) => {
                        setSelectedLibIdx(idx);
                    }}
                    updateModel={false}
                />
            </div>
            <div style={{ paddingTop: 10 }}>
                <SelectField
                    id="library_item"
                    options={Object.entries(selectedLib.data).map(([tag, value]) => ({
                        value: tag,
                        display: value.name,
                    }))}
                    value={selectedItemTag}
                    setValue={(tag) => {
                        setSelectedItemTag(tag);
                    }}
                    updateModel={false}
                />
            </div>

            <table className="table">
                {headings.map((h, i) => (
                    <tr key={i}>
                        <th className="text-left">{h.title}</th>
                        <td>{h.value}</td>
                    </tr>
                ))}
            </table>

            <button
                onClick={() => {
                    onSelect(selectedItemTag, selectedItem);
                }}
            >
                Apply measure
            </button>
        </>
    );
};

function Generation({ assessment, scenarioId }: GenerationProps): ReactElement {
    const scenario = getScenario(assessment, scenarioId);
    const isBaseline = scenarioIsBaseline(scenarioId);

    return (
        <section>
            <h3 className="line-top mt-0">Generation</h3>

            <h4>Solar PV</h4>

            {isBaseline ? null : <button>Apply measure</button>}

            <GenerationMeasureSelector
                onSelect={(tag, measure) =>
                    alert(`Howdidoodledo ${tag} ${measure.toString()}`)
                }
            />

            <FormRow narrow>
                <label htmlFor="field_use_PV_calculator">Use PV calculator</label>
                <CheckboxField
                    id="use_PV_calculator"
                    value={scenario.generation.use_PV_calculator}
                    setValue={(val) => (scenario.generation.use_PV_calculator = val)}
                />
            </FormRow>

            {scenario.generation.use_PV_calculator && (
                <div className="bg-lighter pt-15 px-15 mb-15 width-max-content">
                    {/* !!! - Are any of these coupled to SHW? - should they be? */}

                    <FormRow narrow>
                        <label htmlFor="field_solarpv_kwp_installed">
                            Array installed capacity
                        </label>
                        <NumberField
                            id="solarpv_kwp_installed"
                            units="kWp"
                            value={scenario.generation.solarpv_kwp_installed}
                            setValue={(val) =>
                                (scenario.generation.solarpv_kwp_installed = val)
                            }
                        />
                    </FormRow>

                    <FormRow narrow>
                        <label htmlFor="field_solarpv_orientation">
                            Array orientation
                        </label>
                        <SelectField
                            id="solarpv_orientation"
                            options={[
                                { value: 0, display: 'North' },
                                { value: 1, display: 'NE/NW' },
                                { value: 2, display: 'East/West' },
                                { value: 3, display: 'SE/SW' },
                                { value: 4, display: 'South' },
                            ]}
                            value={scenario.generation.solarpv_orientation}
                            setValue={(val) =>
                                (scenario.generation.solarpv_orientation = val)
                            }
                        />
                    </FormRow>

                    <FormRow narrow>
                        <label htmlFor="field_solarpv_inclination">
                            Array inclination
                        </label>
                        {/* !!! - is this coupled to SolarHotWater inclination? - check model.js */}
                        <NumberField
                            id="solarpv_inclination"
                            units="degrees"
                            value={scenario.generation.solarpv_inclination}
                            setValue={(val) =>
                                (scenario.generation.solarpv_inclination = val)
                            }
                        />
                    </FormRow>

                    <FormRow narrow>
                        <label htmlFor="field_solarpv_overshading">Overshading</label>
                        <SelectField
                            id="solarpv_overshading"
                            options={[
                                { value: 0.5, display: 'Heavy > 80%' },
                                {
                                    value: 0.65,
                                    display: 'Significant 60% - 80%',
                                },
                                { value: 0.8, display: 'Modest 20% - 60%' },
                                {
                                    value: 1,
                                    display: 'None or very little, less than 20%',
                                },
                            ]}
                            value={scenario.generation.solarpv_overshading}
                            setValue={(val) =>
                                (scenario.generation.solarpv_overshading = val)
                            }
                        />
                    </FormRow>
                </div>
            )}

            <FormRow narrow>
                <span>Annual Generation</span>
                {scenario.generation.use_PV_calculator ? (
                    <Result val={scenario.generation.solar_annual_kwh} units={'kWh'} />
                ) : (
                    <NumberField
                        id="solar_annual_kwh"
                        units={'kWh'}
                        value={
                            scenario.generation.solar_annual_kwh
                                ? Math.round(scenario.generation.solar_annual_kwh)
                                : null
                        }
                        setValue={(val) => (scenario.generation.solar_annual_kwh = val)}
                    />
                )}
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_solar_fraction_used_onsite">
                    Fraction used on-site
                </label>
                <NumberField
                    id="solar_fraction_used_onsite"
                    value={scenario.generation.solar_fraction_used_onsite}
                    setValue={(val) =>
                        (scenario.generation.solar_fraction_used_onsite = val)
                    }
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_solar_FIT">Feed-in tariff generation rate</label>
                <NumberField
                    id="solar_FIT"
                    value={scenario.generation.solar_FIT}
                    units={'£/kWh'}
                    setValue={(val) => (scenario.generation.solar_FIT = val)}
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_solar_export_FIT">Feed-in tariff export rate</label>
                <NumberField
                    id="solar_export_FIT"
                    value={scenario.generation.solar_export_FIT}
                    units={'£/kWh'}
                    setValue={(val) => (scenario.generation.solar_export_FIT = val)}
                />
            </FormRow>

            <h4>Wind</h4>

            <FormRow narrow>
                <label htmlFor="field_wind_annual_kwh">Annual Generation</label>
                <NumberField
                    id="wind_annual_kwh"
                    value={scenario.generation.wind_annual_kwh}
                    units={'kWh'}
                    setValue={(val) => (scenario.generation.wind_annual_kwh = val)}
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_wind_fraction_used_onsite">
                    Fraction used on-site
                </label>
                <NumberField
                    id="wind_fraction_used_onsite"
                    value={scenario.generation.wind_fraction_used_onsite}
                    setValue={(val) =>
                        (scenario.generation.wind_fraction_used_onsite = val)
                    }
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_wind_FIT">Feed-in tariff generation rate</label>
                <NumberField
                    id="wind_FIT"
                    value={scenario.generation.wind_FIT}
                    units={'£/kWh'}
                    setValue={(val) => (scenario.generation.wind_FIT = val)}
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_wind_export_FIT">Feed-in tariff export rate</label>
                <NumberField
                    id="wind_export_FIT"
                    value={scenario.generation.wind_export_FIT}
                    units={'£/kWh'}
                    setValue={(val) => (scenario.generation.wind_export_FIT = val)}
                />
            </FormRow>

            <h4>Hydro</h4>
            <FormRow narrow>
                <label htmlFor="field_hydro_annual_kwh">Annual Generation</label>
                <NumberField
                    id="hydro_annual_kwh"
                    value={scenario.generation.hydro_annual_kwh}
                    units={'kWh'}
                    setValue={(val) => (scenario.generation.hydro_annual_kwh = val)}
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_hydro_fraction_used_onsite">
                    Fraction used on-site
                </label>
                <NumberField
                    id="hydro_fraction_used_onsite"
                    value={scenario.generation.hydro_fraction_used_onsite}
                    setValue={(val) =>
                        (scenario.generation.hydro_fraction_used_onsite = val)
                    }
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_hydro_FIT">Feed-in tariff generation rate</label>
                <NumberField
                    id="hydro_FIT"
                    value={scenario.generation.hydro_FIT}
                    units={'£/kWh'}
                    setValue={(val) => (scenario.generation.hydro_FIT = val)}
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_hydro_export_FIT">Feed-in tariff export rate</label>
                <NumberField
                    id="hydro_export_FIT"
                    value={scenario.generation.hydro_export_FIT}
                    units={'£/kWh'}
                    setValue={(val) => (scenario.generation.hydro_export_FIT = val)}
                />
            </FormRow>
        </section>
    );
}

export default Generation;
