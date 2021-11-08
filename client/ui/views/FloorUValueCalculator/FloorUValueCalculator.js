import React, { useState } from 'react';

import FormRow from '../../components/FormRow';
import SelectField from '../../components/SelectField';
import SolidGroundFloor from './SolidGroundFloor';
import BasementFloor from './BasementFloor';
import SuspendedFloor from './SuspendedFloor';
import NumberField from '../../components/NumberField';
import CheckboxField from '../../components/CheckboxField';
import Insulation from './Insulation';
import Result from '../../components/Result';

import calculate from '../../lib/flooruvaluecalculator';

function blankInputs() {
    return {
        //Applies to all floors
        floor_type: 'SOLID_GROUND_FLOOR',
        perimeter: null,
        area: null,
        floor_insulation: {
            hasInsulation: false,
            conductivity: '',
            thickness: null,
        },

        //Solid Ground Floor only
        edge_insulation_type: 'none',
        horizontal_edge_insulation: {
            conductivity: '',
            thickness: null,
            width: null,
        },
        vertical_edge_insulation: {
            conductivity: '',
            thickness: null,
            depth: null,
        },

        //Suspended Floor only
        ventilation: null,

        //Basement only
        basement_depth: null,
    };
}

function FloorUValueCalculator({ inputs, cancel, saver }) {
    const [state, setState] = useState(inputs || blankInputs());

    return (
        <section>
            <FormRow narrow>
                <label htmlFor="field_floor_type">Floor type</label>
                <SelectField
                    id="floor_type"
                    options={[
                        { value: 'SOLID_GROUND_FLOOR', display: 'Solid ground floor' },
                        { value: 'SUSPENDED_FLOOR', display: 'Suspended floor' },
                        { value: 'BASEMENT_FLOOR', display: 'Basement floor' },
                    ]}
                    value={state.floor_type}
                    setValue={(val) => setState({ ...state, floor_type: val })}
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_perimeter">Exposed perimeter</label>
                <NumberField
                    id="perimeter"
                    units="m"
                    value={state.perimeter}
                    setValue={(val) => setState({ ...state, perimeter: val })}
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_area">Area</label>
                <NumberField
                    id="area"
                    units="m²"
                    value={state.area}
                    setValue={(val) => setState({ ...state, area: val })}
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_has_floor_insulation">Has floor insulation?</label>
                <CheckboxField
                    id="has_floor_insulation"
                    value={state.floor_insulation.hasInsulation}
                    setValue={(val) =>
                        setState({
                            ...state,
                            floor_insulation: { ...state.floor_insulation, hasInsulation: val },
                        })
                    }
                />
            </FormRow>

            {state.floor_insulation.hasInsulation && (
                <Insulation
                    id="floor_insulation"
                    conductivity={state.floor_insulation.conductivity}
                    thickness={state.floor_insulation.thickness}
                    setConductivity={(val) =>
                        setState({
                            ...state,
                            floor_insulation: { ...state.floor_insulation, conductivity: val },
                        })
                    }
                    setThickness={(val) =>
                        setState({
                            ...state,
                            floor_insulation: { ...state.floor_insulation, thickness: val },
                        })
                    }
                />
            )}

            {state.floor_type === 'SOLID_GROUND_FLOOR' && (
                <SolidGroundFloor state={state} setState={setState} />
            )}
            {state.floor_type === 'SUSPENDED_FLOOR' && (
                <SuspendedFloor state={state} setState={setState} />
            )}
            {state.floor_type === 'BASEMENT_FLOOR' && (
                <BasementFloor state={state} setState={setState} />
            )}

            <FormRow narrow>
                <span>
                    <b>U-value</b>
                </span>
                <span>
                    <b>
                        <Result
                            val={calculate(state)}
                            units='W/m²K'
                        />
                    </b>
                </span>
            </FormRow>

            <button className="btn" onClick={() => cancel()}>Cancel</button>
            <button className="btn btn-primary ml-15" onClick={() => saver(calculate(state), state)}>
                Save
            </button>
        </section>
    );
}

export default FloorUValueCalculator;
