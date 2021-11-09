import React from 'react';

import FormRow from '../../components/FormRow';
import NumberField from '../../components/NumberField';
import SelectField from '../../components/SelectField';

import { insulationMaterials } from '../../data/flooruvaluecalculator/insulationmaterials'

function Insulation({
    id,
    conductivity,
    thickness,
    setConductivity,
    setThickness,
}) {

    return (
        <div>
            <FormRow narrow indent>
                <label htmlFor={`field_${id}_conductivity`}>Conductivity (W/m.K)</label>
                <SelectField
                    id={`${id}_conductivity`}
                    options={insulationMaterials}
                    value={conductivity}
                    setValue={setConductivity}
                />
            </FormRow>

            <FormRow narrow indent>
                <label htmlFor={`field_${id}_thickness`}>Thickness</label>
                <NumberField
                    id={`${id}_thickness`}
                    units="m"
                    value={thickness}
                    setValue={setThickness}
                />
            </FormRow>
        </div>
    );
}

export default Insulation;
