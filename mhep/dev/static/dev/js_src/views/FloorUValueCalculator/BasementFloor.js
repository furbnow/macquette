import React from 'react'

import FormRow from '../../components/FormRow'
import NumberField from '../../components/NumberField'

function BasementFloor({ state, setState }) {
    return (
        <div>
            <FormRow narrow>
                <label htmlFor="field_basement_depth">Basement Depth</label>
                <NumberField
                    id="basement_depth"
                    units="m"
                    value={state.basement_depth}
                    setValue={(val) => (setState({...state, basement_depth: val}))}
                />
            </FormRow>
        </div>
    )
}

export default BasementFloor
