import React from 'react';

import FormRow from '../../components/FormRow';
import Insulation from './Insulation';
import SelectField from '../../components/SelectField';
import NumberField from '../../components/NumberField';

function SolidGroundFloor({ state, setState }) {
    return (
        <div>
            <FormRow narrow>
                <label htmlFor="field_edge_insulation_type">Edge insulation</label>
                <SelectField
                    id="edge_insulation_type"
                    options={[
                        { value: 'none', display: 'Not installed' },
                        { value: 'horizontal', display: 'Horizontal' },
                        { value: 'vertical', display: 'Vertical' }
                    ]}
                    value={state.edge_insulation_type}
                    setValue={(val) => (setState({ ...state, edge_insulation_type: val }))}
                />
            </FormRow>
            {state.edge_insulation_type === 'horizontal' && (
                <>
                    <Insulation
                        id="horizontal_edge_insulation"
                        conductivity={state.horizontal_edge_insulation.conductivity}
                        thickness={state.horizontal_edge_insulation.thickness}
                        setConductivity={(val) =>
                            setState({
                                ...state,
                                horizontal_edge_insulation: {
                                    ...state.horizontal_edge_insulation,
                                    conductivity: val,
                                },
                            })
                        }
                        setThickness={(val) =>
                            setState({
                                ...state,
                                horizontal_edge_insulation: {
                                    ...state.horizontal_edge_insulation,
                                    thickness: val,
                                },
                            })
                        }
                    />
                    <FormRow narrow indent>
                        <label htmlFor="field_horizontal_edge_insulation_width">Width</label>
                        <NumberField
                            id="horizontal_edge_insulation_width"
                            units="m"
                            value={state.horizontal_edge_insulation.width}
                            setValue={(val) => setState({
                                ...state,
                                horizontal_edge_insulation: {
                                    ...state.horizontal_edge_insulation,
                                    width: val,
                                },
                            })
                            }
                        />
                    </FormRow>
                </>
            )}


            {state.edge_insulation_type === 'vertical' && (
                <>
                    <Insulation
                        id="vertical_edge_insulation"
                        conductivity={state.vertical_edge_insulation.conductivity}
                        thickness={state.vertical_edge_insulation.thickness}
                        setConductivity={(val) =>
                            setState({
                                ...state,
                                vertical_edge_insulation: {
                                    ...state.vertical_edge_insulation,
                                    conductivity: val,
                                },
                            })
                        }
                        setThickness={(val) =>
                            setState({
                                ...state,
                                vertical_edge_insulation: {
                                    ...state.vertical_edge_insulation,
                                    thickness: val,
                                },
                            })
                        }
                    />
                    <FormRow narrow indent>
                        <label htmlFor="field_vertical_edge_insulation_depth">Depth</label>
                        <NumberField
                            id="vertical_edge_insulation_depth"
                            units="m"
                            value={state.vertical_edge_insulation.depth}
                            setValue={(val) => setState({
                                ...state,
                                vertical_edge_insulation: {
                                    ...state.vertical_edge_insulation,
                                    depth: val,
                                },
                            })
                            }
                        />
                    </FormRow>
                </>
            )}
        </div>
    );
}

export default SolidGroundFloor;
