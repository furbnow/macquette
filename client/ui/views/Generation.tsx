import React, { useState, useContext, ReactElement } from 'react';

import { AppContext } from '../context/AppContext';
import { NewAssessment, ScenarioString } from '../types/Assessment';
import { Library, GenerationMeasuresLibrary } from '../types/Library';

import { getScenario, scenarioIsBaseline } from '../lib/scenarios';

import CheckboxField from '../components/CheckboxField';
import FormRow from '../components/FormRow';
import NumberField from '../components/NumberField';
import Result from '../components/Result';
import SelectField from '../components/SelectField';

import { SelectGenerationMeasure } from '../components/SelectLibrary';

/**
 * Check if there are any generation measures that can be applied.
 */
function haveGenerationMeasures(libraries: Library[]): boolean {
    const generationLibs = libraries.filter<GenerationMeasuresLibrary>(
        (lib): lib is GenerationMeasuresLibrary => lib.type === 'generation_measures'
    );

    /* For this to return true, at least one library must have one item */
    for (const lib of generationLibs) {
        if (Object.keys(lib.data).length !== 0) {
            return true;
        }
    }

    return false;
}

interface GenerationProps {
    assessment: NewAssessment;
    scenarioId: ScenarioString;
}

function Generation({ assessment, scenarioId }: GenerationProps): ReactElement {
    const { update, libraries } = useContext(AppContext);

    const [showMeasuresDialogue, setShowMeasuresDialogue] = useState(false);

    const scenario = getScenario(assessment, scenarioId);
    const isBaseline = scenarioIsBaseline(scenarioId);

    const measuresExist = haveGenerationMeasures(libraries);

    return (
        <section>
            <h3 className="line-top mt-0">Generation</h3>

            <h4>Solar PV</h4>

            {!scenario.measures.PV_generation && !isBaseline && (
                <div
                    className="d-flex pa-15 mb-15 width-max-content"
                    style={{ border: '1px solid black' }}
                >
                    <span style={{ minWidth: '20rem' }}>No measure applied</span>

                    <button
                        className="btn"
                        onClick={() => setShowMeasuresDialogue(true)}
                        disabled={!measuresExist}
                    >
                        {measuresExist ? 'Apply measure' : 'No measures available'}
                    </button>
                </div>
            )}

            {scenario.measures.PV_generation && (
                <div className="d-flex pa-15 mb-15" style={{ border: '1px solid black' }}>
                    <p className="mb-0">
                        <b>Measure {scenario.measures.PV_generation.measure.tag}</b>{' '}
                        applied:
                        <br />
                        {scenario.measures.PV_generation.measure.description}
                    </p>

                    <div style={{ flexShrink: 0 }}>
                        <button
                            className="btn ml-15"
                            onClick={() => setShowMeasuresDialogue(true)}
                            disabled={!measuresExist}
                        >
                            {measuresExist
                                ? 'Apply different measure'
                                : 'No measures available'}
                        </button>

                        <button
                            className="btn ml-15"
                            onClick={() => {
                                scenario.generation.use_PV_calculator = false;
                                delete scenario.measures.PV_generation;
                                update();
                            }}
                        >
                            Remove
                        </button>
                    </div>
                </div>
            )}

            {showMeasuresDialogue && (
                <SelectGenerationMeasure
                    currentSelectedItemTag={null}
                    onSelect={(tag, measure) => {
                        scenario.measures.PV_generation = {
                            measure: {
                                ...measure,
                                quantity: parseFloat(measure.kWp),
                                cost_total:
                                    parseFloat(measure.cost) * parseFloat(measure.kWp),
                            },
                            // TODO: this is unused.  Delete it.
                            original_annual_generation: 0,
                        };

                        scenario.generation.solarpv_kwp_installed = parseFloat(
                            measure.kWp
                        );
                        scenario.generation.use_PV_calculator = true;

                        update();
                    }}
                    onClose={() => setShowMeasuresDialogue(false)}
                />
            )}

            <FormRow narrow>
                <label htmlFor="field_use_PV_calculator">Use PV calculator</label>
                <CheckboxField
                    id="use_PV_calculator"
                    value={scenario.generation.use_PV_calculator}
                    setValue={(useCalc) => {
                        scenario.generation.use_PV_calculator = useCalc;
                    }}
                    disabled={scenario.measures.PV_generation ? true : false}
                />
            </FormRow>

            {scenario.generation.use_PV_calculator && (
                <div className="bg-lighter pt-15 px-15 mb-15 width-max-content">
                    {/* TODO: Are any of these coupled to SHW? Should they be? */}

                    <FormRow narrow>
                        <label htmlFor="field_solarpv_kwp_installed">
                            Array installed capacity
                        </label>

                        {scenario.measures.PV_generation ? (
                            <Result
                                val={scenario.generation.solarpv_kwp_installed}
                                units="kWp"
                                dp={1}
                            />
                        ) : (
                            <NumberField
                                id="solarpv_kwp_installed"
                                units="kWp"
                                value={scenario.generation.solarpv_kwp_installed}
                                setValue={(val) =>
                                    (scenario.generation.solarpv_kwp_installed = val)
                                }
                            />
                        )}
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
                    <Result
                        val={scenario.generation.solar_annual_kwh}
                        units={'kWh'}
                        dp={0}
                    />
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
