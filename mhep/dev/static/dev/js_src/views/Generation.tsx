import React, { useState, useContext, useEffect, useCallback, ReactElement } from 'react';

import { AppContext } from '../context/AppContext';
import { NewAssessment } from '../types/Assessment';
import { GenerationMeasuresLibrary, GenerationMeasure } from '../types/Library';

import { getScenario, scenarioIsBaseline } from '../lib/scenarios';

import CheckboxField from '../components/CheckboxField';
import FormRow from '../components/FormRow';
import NumberField from '../components/NumberField';
import Result from '../components/Result';
import SelectField from '../components/SelectField';

interface DialogProps {
    /** HTML id for the header that labels this dialog */
    headerId: string;
    /** Function to be called when dialog closes */
    onClose: () => void;
    children: ReactElement | ReactElement[];
}

function Dialog({ headerId, onClose, children }: DialogProps): ReactElement {
    // WAI-ARIA-PRACTICES says we should have Escape as a way to close the dialog
    const escapeKeyHandler = useCallback(
        (evt: KeyboardEvent) => {
            if (evt.code === 'Escape') {
                onClose();
            }
        },
        [onClose]
    );

    useEffect(() => {
        document.addEventListener('keydown', escapeKeyHandler, false);
        // We need to put has_dialog on the body to remove the scrollbar
        document.body.classList.add('has_dialog');
        return () => {
            document.removeEventListener('keydown', escapeKeyHandler, false);
            document.body.classList.remove('has_dialog');
        };
    }, [escapeKeyHandler]);

    return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
            className="dialog-backdrop"
            onClick={(evt) => {
                // Clicking on the backdrop (but not its nested children) should also
                // close the dialog
                const target = evt.target as HTMLDivElement;
                if (target.className === 'dialog-backdrop') {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={headerId}
                className="notbootstrap"
            >
                {children}
            </div>
        </div>
    );
}

interface GenerationMeasureSelectorProps {
    onSelect: (tag: string, measure: GenerationMeasure) => void;
    onClose: () => void;
}

const GenerationMeasureSelector = ({
    onSelect,
    onClose,
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
        <Dialog onClose={onClose} headerId="generation_measure_header">
            <div className="dialog-header">
                <h4 className="mt-0 mb-15" id="generation_measure_header">
                    Select generation measure
                </h4>

                <div className="d-flex">
                    <div>
                        <label htmlFor="field_library_item" className="small-caps">
                            Item
                        </label>
                        <SelectField
                            id="library_item"
                            options={Object.entries(selectedLib.data).map(
                                ([tag, value]) => ({
                                    value: tag,
                                    display: value.name,
                                })
                            )}
                            value={selectedItemTag}
                            setValue={(tag) => {
                                setSelectedItemTag(tag);
                            }}
                            updateModel={false}
                            // WAI-ARIA-PRACTICES tells us to use autofocus here so...
                            // https://www.w3.org/TR/wai-aria-practices-1.1/examples/dialog-modal/dialog.html
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus={true}
                        />
                    </div>
                    <div className="ml-30">
                        <label htmlFor="field_library_select" className="small-caps">
                            From library
                        </label>
                        {generationLibs.length > 1 ? (
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
                        ) : (
                            <div
                                style={{
                                    height: 30,
                                    verticalAlign: 'middle',
                                    display: 'table-cell',
                                }}
                            >
                                {selectedLib.name}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="dialog-body">
                <table className="table">
                    <tbody>
                        {headings.map((h, i) => (
                            <tr key={i}>
                                <th className="text-left">{h.title}</th>
                                <td>{h.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="dialog-footer text-right">
                <button className="btn mr-15" onClick={() => onClose()}>
                    Cancel
                </button>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        onSelect(selectedItemTag, selectedItem);
                        onClose();
                    }}
                >
                    Apply measure
                </button>
            </div>
        </Dialog>
    );
};

interface GenerationProps {
    assessment: NewAssessment;
    scenarioId: string;
}

function Generation({ assessment, scenarioId }: GenerationProps): ReactElement {
    const { update } = useContext(AppContext);

    const [showMeasuresDialogue, setShowMeasuresDialogue] = useState(false);

    const scenario = getScenario(assessment, scenarioId);
    const isBaseline = scenarioIsBaseline(scenarioId);

    return (
        <section>
            <h3 className="line-top mt-0">Generation</h3>

            <h4>Solar PV</h4>

            {/* any reason not to use `&&` instead? */}
            {isBaseline ? null : (
                <>
                    <button onClick={() => setShowMeasuresDialogue(true)}>
                        Apply measure
                    </button>

                    <button
                        onClick={() => {
                            scenario.generation.use_PV_calculator = false;
                            delete scenario.measures.PV_generation;
                            update();
                        }}
                    >
                        Remove
                    </button>
                </>
            )}

            {/* use a FormRow??? */}
            {scenario.measures.PV_generation?.measure.tag && (
                <FormRow>
                    <span>
                        <br />
                        <b>{scenario.measures.PV_generation.measure.tag}</b> measure has
                        been applied:
                        <div>{scenario.measures.PV_generation.measure.description}</div>
                        <br />
                    </span>
                </FormRow>
            )}

            {showMeasuresDialogue && (
                <GenerationMeasureSelector
                    onSelect={(tag, measure) => {
                        if (scenario.measures.PV_generation === undefined) {
                            scenario.measures.PV_generation = {
                                measure: measure,
                            };
                        } else {
                            scenario.measures.PV_generation.measure = measure;
                        }
                        scenario.measures.PV_generation.measure.tag = tag;
                        scenario.measures.PV_generation.measure.quantity = measure.kWp;
                        scenario.measures.PV_generation.measure.cost_total =
                            measure.cost * measure.kWp;
                        scenario.generation.solarpv_kwp_installed = measure.kWp;
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
                    disabled={scenario.measures.PV_generation?.measure && true}
                />
            </FormRow>

            {scenario.generation.use_PV_calculator && (
                <div className="bg-lighter pt-15 px-15 mb-15 width-max-content">
                    {/* !!! - Are any of these coupled to SHW? - should they be? */}

                    <FormRow narrow>
                        <label htmlFor="field_solarpv_kwp_installed">
                            Array installed capacity
                        </label>

                        {scenario.generation.use_PV_calculator ? (
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
