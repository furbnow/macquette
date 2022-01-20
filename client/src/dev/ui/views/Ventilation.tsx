/*
Note:
The keys used on the assessment 'blob' sometimes differ slightly to those on the library (measure).
You will see code like:
    scenario.ventilation.system_specific_fan_power = measure.specific_fan_power;` //not a mistake

- Is there a ticket to fix this???
*/

// floor override doesn't work.
// boolean doesn't stick and the value doesn't stay (also on v2, see https://gitlab.com/carboncoop/macquette/-/issues/742)
// discuss with Anna?

import React, { ReactElement, useContext, useState } from 'react';
import CheckboxField from '../components/CheckboxField';
import FormRow from '../components/FormRow';
import NumberField from '../components/NumberField';
import OnOffToggleButton from '../components/OnOffToggleButton';
import Result from '../components/Result';
import SelectField from '../components/SelectField';
import {
    SelectClothesDryingItem,
    SelectDraughtProofingMeasure,
    SelectExtractVentilationMeasure,
    SelectIntentionalVent,
    SelectIntentionalVentMeasure,
    SelectVentilationSystem,
    SelectVentilationSystemMeasure,
} from '../components/SelectLibrary';
import TextField from '../components/TextField';
import { AppContext } from '../context/AppContext';
import { addQuantityAndCostToMeasure } from '../lib/measures';
import { getScenario, scenarioIsBaseline } from '../lib/scenarios';
import {
    NewAssessment,
    ScenarioString,
    VentilationDwellingConstruction,
    VentilationSuspendedWoodenFloor,
} from '../types/Assessment';

function getNextId<T extends { id: number }>(libraryItemsInUse: T[]): number {
    if (libraryItemsInUse.length === 0) {
        return 0;
    }
    const ids = libraryItemsInUse.map((item) => item.id);
    const maxId = Math.max(...ids);
    return maxId + 1;
}

function isAlsoMeasure<T>(libraryItemInUseId: number, measuresForLib: T): boolean {
    if (measuresForLib === undefined) {
        return false;
    }
    return Object.keys(measuresForLib).includes(libraryItemInUseId.toString());
}

interface VentilationProps {
    assessment: NewAssessment;
    scenarioId: ScenarioString;
}

function Ventilation({ assessment, scenarioId }: VentilationProps): ReactElement {
    const { update } = useContext(AppContext);

    const [showVentilationSystemDialog, setShowVentilationSystemDialog] = useState(false);
    const [showExtractVentilationPointsDialog, setShowExtractVentilationPointsDialog] =
        useState(false);
    const [showDraughtProofingDialog, setShowDraughtProofingDialog] = useState(false);
    const [showIntentionalVentsAndFluesDialog, setShowIntentionalVentsAndFluesDialog] =
        useState(false);
    const [showClothesDryingFacilitiesDialog, setShowClothesDryingFacilitiesDialog] =
        useState(false);

    const scenario = getScenario(assessment, scenarioId);
    const isBaseline = scenarioIsBaseline(scenarioId);

    return (
        <section>
            <section>
                <h3 className="line-top mt-0">Ventilation</h3>
                <h4>Ventilation type</h4>

                <details className="mb-15">
                    <summary>Info</summary>

                    <div>
                        SAP only considers four types of ventilation systems:
                        <ol type="a">
                            <li>
                                Balanced mechanical ventilation with heat recovery (MVHR)
                            </li>
                            <li>
                                Balanced mechanical ventilation without heat recovery (MV)
                            </li>
                            <li>
                                Whole house extract ventilation or positive input
                                ventilation from outside
                            </li>
                            <li>
                                Natural ventilation or whole house positive input
                                ventilation from loft
                            </li>
                        </ol>
                        But MHEP considers:
                        <ul>
                            <li>NV: natural ventilation (type d in SAP)</li>
                            <li>IE: Intermittent Extract Ventilations (type d in SAP)</li>
                            <li>PS: Passive Stack (type d in SAP)</li>
                            <li>
                                DEV: Decentralised continous mechanical extract
                                ventilation (type c in SAP)
                            </li>
                            <li>
                                MEV: Centralised Mechanical Continuous Extract Ventilation
                                (type c in SAP)
                            </li>
                            <li>
                                MV: Balanced Mechanical Ventilations without heat recovery
                                (type b in SAP)
                            </li>
                            <li>
                                MVHR: Balanced mechanical ventilation with heat recovery
                                (type a in SAP)
                            </li>
                        </ul>
                    </div>
                </details>

                <FormRow>
                    <span>System</span>
                    <span>
                        {scenario.ventilation.ventilation_tag}{' '}
                        {'ventilation_systems_measures' in
                            scenario.measures.ventilation && <b>Measure applied</b>}
                        <br />
                        {scenario.ventilation.ventilation_name} (
                        {scenario.ventilation.ventilation_type})
                    </span>
                </FormRow>

                <FormRow>
                    <span>Air change rate</span>
                    <Result
                        val={parseFloat(scenario.ventilation.system_air_change_rate)}
                        units="ACH"
                    />
                </FormRow>

                <FormRow>
                    <span>Specific Fan Power</span>
                    <Result
                        val={parseFloat(scenario.ventilation.system_specific_fan_power)}
                        units="W/litre.sec"
                        dp={1}
                    />
                </FormRow>

                <FormRow>
                    <span>Heat recovery efficiency allowing for in-use factor</span>
                    <Result
                        val={parseFloat(
                            scenario.ventilation.balanced_heat_recovery_efficiency,
                        )}
                        units="%"
                        dp={1}
                    />
                </FormRow>

                {isBaseline ? (
                    <>
                        <button
                            className="btn"
                            onClick={() => setShowVentilationSystemDialog(true)}
                        >
                            Change System
                        </button>

                        {showVentilationSystemDialog && (
                            <SelectVentilationSystem
                                currentSelectedItemTag={
                                    scenario.ventilation.ventilation_tag
                                }
                                onSelect={(selectedItemTag, measure) => {
                                    scenario.ventilation = {
                                        ...scenario.ventilation,
                                        ...measure,
                                        ventilation_tag: measure.tag,
                                        ventilation_name: measure.name,
                                        system_specific_fan_power:
                                            measure.specific_fan_power,
                                    };
                                    update();
                                }}
                                onClose={() => setShowVentilationSystemDialog(false)}
                            />
                        )}
                    </>
                ) : (
                    <>
                        <button
                            className="btn"
                            onClick={() => setShowVentilationSystemDialog(true)}
                        >
                            Apply Measure
                        </button>

                        {showVentilationSystemDialog && (
                            <SelectVentilationSystemMeasure
                                currentSelectedItemTag={
                                    scenario.measures.ventilation
                                        .ventilation_systems_measures?.measure.tag || null
                                }
                                onSelect={(selectedItemTag, measure) => {
                                    scenario.ventilation = {
                                        ...scenario.ventilation,
                                        ...measure,
                                        ventilation_tag: measure.tag,
                                        ventilation_name: measure.name,
                                        system_specific_fan_power:
                                            measure.specific_fan_power,
                                    };
                                    scenario.measures.ventilation.ventilation_systems_measures =
                                        {
                                            measure,
                                        };
                                    addQuantityAndCostToMeasure(measure);
                                    update();
                                }}
                                onClose={() => setShowVentilationSystemDialog(false)}
                            />
                        )}
                    </>
                )}

                {(scenario.ventilation.ventilation_type === 'PS' ||
                    scenario.ventilation.ventilation_type === 'IE') && (
                    <>
                        <h4 className="mt-0 mb-15">
                            Extract ventilation points (intermittent fans and passive
                            vents)
                        </h4>

                        <button
                            className="btn"
                            onClick={() => setShowExtractVentilationPointsDialog(true)}
                        >
                            {isBaseline ? 'Add' : 'Apply Measure'}
                        </button>

                        {showExtractVentilationPointsDialog && (
                            <SelectExtractVentilationMeasure
                                currentSelectedItemTag={null}
                                onSelect={(selectedItemTag, measure) => {
                                    const newPoint = {
                                        id: getNextId(scenario.ventilation.EVP),
                                        tag: measure.tag,
                                        name: measure.name,
                                        type: measure.type,
                                        ventilation_rate: measure.ventilation_rate,
                                        location: '',
                                    };
                                    scenario.ventilation.EVP.push(newPoint);

                                    if (!isBaseline) {
                                        addQuantityAndCostToMeasure(measure);

                                        if (
                                            scenario.measures.ventilation
                                                .extract_ventilation_points
                                        ) {
                                            scenario.measures.ventilation.extract_ventilation_points.push(
                                                measure,
                                            );
                                        } else {
                                            scenario.measures.ventilation.extract_ventilation_points =
                                                [measure];
                                        }
                                    }

                                    update();
                                }}
                                onClose={() =>
                                    setShowExtractVentilationPointsDialog(false)
                                }
                            />
                        )}

                        <br />
                        <br />
                        {scenario.ventilation.EVP.length !== 0 && (
                            <table style={{ width: '100%', textAlign: 'left' }}>
                                <tbody>
                                    <tr>
                                        <th></th>
                                        <th>Location</th>
                                        <th>Type</th>
                                        <th>Ventilation rate (m³/h)</th>
                                        <th></th>
                                    </tr>

                                    {scenario.ventilation.EVP.map((EVP, i) => (
                                        <tr key={i}>
                                            <td>
                                                {EVP.tag}
                                                <br />
                                                {EVP.name}
                                                {!isBaseline &&
                                                    isAlsoMeasure(
                                                        EVP.id,
                                                        scenario.measures.ventilation
                                                            ?.extract_ventilation_points,
                                                    ) && <b> (Measure Applied)</b>}
                                            </td>
                                            <td>
                                                <TextField
                                                    id="location"
                                                    value={EVP.location}
                                                    setValue={(val) => {
                                                        EVP.location = val;
                                                    }}
                                                />
                                            </td>
                                            <td>{EVP.type}</td>
                                            <td>{EVP.ventilation_rate}</td>
                                            <td>
                                                <button
                                                    className="btn"
                                                    onClick={() => {
                                                        scenario.ventilation.EVP =
                                                            scenario.ventilation.EVP.filter(
                                                                (filteredEVP) =>
                                                                    filteredEVP.id !==
                                                                    EVP.id,
                                                            );
                                                        if (
                                                            !isBaseline &&
                                                            scenario.measures.ventilation
                                                                .extract_ventilation_points
                                                        ) {
                                                            delete scenario.measures
                                                                .ventilation
                                                                .extract_ventilation_points[
                                                                EVP.id
                                                            ];
                                                        }
                                                        update();
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </>
                )}
            </section>

            <section>
                <h3 className="line-top mt-0">Inflitration</h3>

                <FormRow>
                    <span>
                        <h4>Structural infiltration</h4>
                    </span>
                    <b>
                        <Result
                            val={
                                scenario.ventilation
                                    .infiltration_rate_incorp_shelter_factor
                            }
                            units="ACH"
                            dp={2}
                        />
                    </b>
                </FormRow>
                <FormRow>
                    <label htmlFor="field_number_of_sides_sheltered">
                        Number of sides sheltered
                    </label>
                    <NumberField
                        id="number_of_sides_sheltered"
                        value={scenario.ventilation.number_of_sides_sheltered}
                        setValue={(val) =>
                            (scenario.ventilation.number_of_sides_sheltered = val)
                        }
                    />
                </FormRow>

                {!isBaseline && (
                    <FormRow>
                        <span>Draughtproofing measures</span>
                        <button
                            className="btn"
                            onClick={() => setShowDraughtProofingDialog(true)}
                        >
                            Apply Measure
                        </button>
                        {scenario.measures.ventilation?.draught_proofing_measures
                            ?.measure && (
                            <>
                                <b style={{ paddingLeft: 10 }}>
                                    {`(Measure Applied: ${scenario.measures.ventilation.draught_proofing_measures.measure.name})`}
                                </b>
                                <button
                                    style={{ border: 'none', background: 'none' }}
                                    onClick={() => {
                                        delete scenario.measures.ventilation
                                            ?.draught_proofing_measures;
                                        update();
                                    }}
                                >
                                    <i className="icon-trash" />
                                </button>
                            </>
                        )}
                    </FormRow>
                )}
                {showDraughtProofingDialog && (
                    <SelectDraughtProofingMeasure
                        currentSelectedItemTag={
                            scenario.measures.ventilation?.draught_proofing_measures
                                ?.measure?.tag || null
                        }
                        onSelect={(selectedItemTag, measure) => {
                            if (!isBaseline) {
                                let q50 = parseFloat(measure.q50);
                                //bug? - preserve the current logic for now (see https://gitlab.com/carboncoop/macquette/-/issues/737)
                                if (
                                    q50 < 0 &&
                                    scenario.ventilation.air_permeability_value
                                ) {
                                    q50 =
                                        scenario.ventilation?.air_permeability_value -
                                        q50;
                                }
                                scenario.ventilation.air_permeability_value = q50;

                                addQuantityAndCostToMeasure(measure);

                                scenario.measures.ventilation.draught_proofing_measures =
                                    { measure };
                                scenario.ventilation.air_permeability_test = true; // `air_permeability_test` overrides calculating q50 manually!
                            }
                            update();
                        }}
                        onClose={() => setShowDraughtProofingDialog(false)}
                    />
                )}

                {scenario.measures.ventilation?.draught_proofing_measures?.measure ===
                    undefined && (
                    <FormRow>
                        <label htmlFor="field_air_permeability_test">
                            Calculate infiltration rate based on air tightness test?
                        </label>
                        <CheckboxField
                            id="air_permeability_test"
                            value={scenario.ventilation.air_permeability_test}
                            setValue={(useCalc) => {
                                scenario.ventilation.air_permeability_test = useCalc;
                            }}
                        />
                    </FormRow>
                )}

                {scenario.ventilation.air_permeability_test ? (
                    <FormRow>
                        <label htmlFor="field_air_permeability_value">
                            Air permeability value, q50
                        </label>
                        <NumberField
                            disabled={
                                scenario.measures.ventilation?.draught_proofing_measures
                                    ?.measure !== undefined
                            }
                            id="air_permeability_value"
                            value={scenario.ventilation.air_permeability_value}
                            units="m³/h/m²"
                            setValue={(val) =>
                                (scenario.ventilation.air_permeability_value = val)
                            }
                        />
                    </FormRow>
                ) : (
                    <>
                        <FormRow>
                            {!scenario.use_num_of_floors_override ? (
                                <>
                                    <span>Assumed number of storeys</span>
                                    <Result val={scenario.num_of_floors} dp={0} />
                                </>
                            ) : (
                                <>
                                    <label htmlFor="field_num_of_floors_overide">
                                        Specify number of storeys
                                    </label>
                                    <NumberField
                                        id="num_of_floors_overide"
                                        value={scenario.num_of_floors_override}
                                        setValue={(val) =>
                                            (scenario.num_of_floors_override = val)
                                        }
                                    />
                                </>
                            )}
                            <OnOffToggleButton
                                onTitle={`Use assumed number (${scenario.num_of_floors})`}
                                offTitle="Override"
                                value={scenario.use_num_of_floors_override}
                                setValue={(val) =>
                                    (scenario.use_num_of_floors_override = val)
                                }
                            />
                        </FormRow>

                        <FormRow>
                            <label htmlFor="field_dwelling_construction">Walls</label>
                            <SelectField
                                id="dwelling_construction"
                                options={[
                                    {
                                        value: 'timberframe',
                                        display: 'Timber Frame (+0.2 ACH)',
                                    },
                                    { value: 'masonry', display: 'Masonry (+0.35 ACH)' },
                                ]}
                                value={scenario.ventilation.dwelling_construction}
                                setValue={(val: VentilationDwellingConstruction) =>
                                    (scenario.ventilation.dwelling_construction = val)
                                }
                            />
                        </FormRow>

                        <FormRow>
                            <label htmlFor="field_suspended_wooden_floor">Floor</label>
                            <SelectField
                                id="suspended_wooden_floor"
                                options={[
                                    {
                                        value: 'unsealed',
                                        display:
                                            'Suspended unsealed wooden floor (+0.2 ACH)',
                                    },
                                    {
                                        value: 'sealed',
                                        display:
                                            'Suspended sealed wooden floor (+0.1 ACH)',
                                    },
                                    { value: '0', display: 'Solid floor (+0 ACH)' },
                                ]}
                                value={scenario.ventilation.suspended_wooden_floor}
                                setValue={(val: VentilationSuspendedWoodenFloor) =>
                                    (scenario.ventilation.suspended_wooden_floor = val)
                                }
                            />
                        </FormRow>

                        <FormRow>
                            <label htmlFor="field_percentage_draught_proofed">
                                Percentage of windows and doors draught proofed
                            </label>
                            <NumberField
                                id="percentage_draught_proofed"
                                value={scenario.ventilation.percentage_draught_proofed}
                                units="%"
                                setValue={(val) =>
                                    (scenario.ventilation.percentage_draught_proofed =
                                        val)
                                }
                            />
                        </FormRow>

                        <FormRow>
                            <label htmlFor="field_draught_lobby">Draught lobby?</label>
                            <CheckboxField
                                id="draught_lobby"
                                value={scenario.ventilation.draught_lobby}
                                setValue={(useCalc) => {
                                    scenario.ventilation.draught_lobby = useCalc;
                                }}
                            />
                        </FormRow>
                    </>
                )}

                <h4 className="mt-0 mb-15">
                    Chimneys, open flues and flueless gas fires
                </h4>

                <button
                    className="btn"
                    onClick={() => setShowIntentionalVentsAndFluesDialog(true)}
                >
                    {isBaseline ? 'Add' : 'Apply Measure'}
                </button>

                {showIntentionalVentsAndFluesDialog && isBaseline && (
                    <SelectIntentionalVent
                        currentSelectedItemTag={null}
                        onSelect={(_, measure) => {
                            const id = getNextId(scenario.ventilation.IVF);
                            scenario.ventilation.IVF.push({
                                id: id,
                                location: '',
                                ...measure,
                            });
                            update();
                        }}
                        onClose={() => setShowIntentionalVentsAndFluesDialog(false)}
                    />
                )}

                {showIntentionalVentsAndFluesDialog && !isBaseline && (
                    <SelectIntentionalVentMeasure
                        currentSelectedItemTag={null}
                        onSelect={(_, measure) => {
                            const id = getNextId(scenario.ventilation.IVF);
                            scenario.ventilation.IVF.push({
                                id: id,
                                location: '',
                                ...measure,
                            });
                            if (
                                scenario.measures.ventilation
                                    .intentional_vents_and_flues_measures === undefined
                            ) {
                                scenario.measures.ventilation.intentional_vents_and_flues_measures =
                                    {};
                            }
                            addQuantityAndCostToMeasure(measure);
                            scenario.measures.ventilation.intentional_vents_and_flues_measures[
                                id
                            ] = {
                                measure: {
                                    id: id,
                                    ...measure,
                                },
                            };
                            update();
                        }}
                        onClose={() => setShowIntentionalVentsAndFluesDialog(false)}
                    />
                )}

                {scenario.ventilation.IVF.length !== 0 && (
                    <table style={{ width: '100%', textAlign: 'left' }}>
                        <tbody>
                            <tr>
                                <th></th>
                                <th>Location</th>
                                <th>Type</th>
                                <th>Ventilation rate (m³/h)</th>
                                <th></th>
                            </tr>

                            {scenario.ventilation.IVF.map((IVF, i) => (
                                <tr key={i}>
                                    <td>
                                        {`${IVF.tag}: ${IVF.name}`}
                                        {!isBaseline &&
                                            isAlsoMeasure(
                                                IVF.id,
                                                scenario.measures.ventilation
                                                    ?.intentional_vents_and_flues_measures,
                                            ) && <b> (Measure Applied)</b>}
                                    </td>
                                    <td>
                                        <TextField
                                            id="location"
                                            value={IVF.location}
                                            setValue={(val) => {
                                                IVF.location = val;
                                            }}
                                        />
                                    </td>
                                    <td>{IVF.type}</td>
                                    <td>{IVF.ventilation_rate}</td>
                                    <td>
                                        <button
                                            style={{ border: 'none', background: 'none' }}
                                            onClick={() => {
                                                scenario.ventilation.IVF =
                                                    scenario.ventilation.IVF.filter(
                                                        (filteredIVF) =>
                                                            filteredIVF.id !== IVF.id,
                                                    );
                                                if (
                                                    !isBaseline &&
                                                    scenario.measures.ventilation
                                                        .intentional_vents_and_flues_measures
                                                ) {
                                                    delete scenario.measures.ventilation
                                                        .intentional_vents_and_flues_measures[
                                                        IVF.id
                                                    ];
                                                }
                                                update();
                                            }}
                                        >
                                            <i className="icon-trash" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            <section>
                <h3 className="line-top mt-0">Clothes drying facilities</h3>

                <button
                    className="btn"
                    onClick={() => setShowClothesDryingFacilitiesDialog(true)}
                >
                    {isBaseline ? 'Add' : 'Apply Measure'}
                </button>

                {showClothesDryingFacilitiesDialog && (
                    <SelectClothesDryingItem
                        currentSelectedItemTag={null}
                        onSelect={(selectedItemTag, measure) => {
                            const id = getNextId(scenario.ventilation.CDF);
                            scenario.ventilation.CDF.push({
                                id: id,
                                ...measure,
                            });
                            if (!isBaseline) {
                                if (
                                    scenario.measures.ventilation
                                        .clothes_drying_facilities === undefined
                                ) {
                                    scenario.measures.ventilation.clothes_drying_facilities =
                                        {};
                                }
                                addQuantityAndCostToMeasure(measure);
                                scenario.measures.ventilation.clothes_drying_facilities[
                                    id
                                ] = {
                                    measure: {
                                        id,
                                        ...measure,
                                    },
                                };
                            }
                            update();
                        }}
                        onClose={() => setShowClothesDryingFacilitiesDialog(false)}
                    />
                )}

                <br />
                <br />
                {scenario.ventilation.CDF.map((CDF, i) => (
                    <FormRow key={i}>
                        <span>
                            <button
                                style={{ border: 'none', background: 'none' }}
                                onClick={() => {
                                    scenario.ventilation.CDF =
                                        scenario.ventilation.CDF.filter(
                                            (filteredCDF) => filteredCDF.id !== CDF.id,
                                        );
                                    if (!isBaseline) {
                                        if (
                                            scenario.measures.ventilation
                                                .clothes_drying_facilities
                                        ) {
                                            delete scenario.measures.ventilation
                                                .clothes_drying_facilities[CDF.id];
                                        }
                                    }
                                    update();
                                }}
                            >
                                <i className="icon-trash" style={{ marginLeft: 0 }} />
                            </button>
                            {` ${CDF.tag}: ${CDF.name}`}
                        </span>

                        {!isBaseline &&
                            isAlsoMeasure(
                                CDF.id,
                                scenario.measures.ventilation.clothes_drying_facilities,
                            ) && <b> (Measure Applied)</b>}
                    </FormRow>
                ))}
            </section>
        </section>
    );
}

export default Ventilation;
