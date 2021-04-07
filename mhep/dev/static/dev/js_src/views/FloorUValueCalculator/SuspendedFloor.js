import React from 'react'

import FormRow from '../../components/FormRow'
import RadioField from '../../components/RadioField'
import Tooltip from '../../components/Tooltip'

function SuspendedFloor({ state, setState }) {
    return (
        <div>
            <FormRow narrow>
                <p>Ventilation
                    <Tooltip>Height of floor deck above ground level and ventilation opening area per unit perimeter of underfloor space (m²/m)</Tooltip>
                </p>
                <RadioField
                    id="ventilation"
                    options={[
                        { value: 0.0015, display: 'Standard: ~ 0.0015 m²/m' },
                        { value: 0.0030, display: 'Well ventilated: ~ 0.0030 m²/m' }
                    ]}
                    value={state.ventilation}
                    setValue={(val) => (setState({ ...state, ventilation: val }))}
                />
            </FormRow>
            <br />
        </div>
    )
}

export default SuspendedFloor
