import React from 'react';

import FormRow from '../../components/FormRow';
import NumberField from '../../components/NumberField';
import SelectField from '../../components/SelectField';

import { insulationMaterials } from '../../data/flooruvaluecalculator/insulationmaterials'

function Insulation({
    id,
    conductivity,
    thickness,
    fraction,
    setConductivity,
    setThickness,
    setFraction,
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

            <FormRow narrow indent>
                <label htmlFor={`???`}>Fraction</label>
                <NumberField
                    // id={`${id}_thickness`}
                    value={fraction}
                    setValue={setFraction}
                />
            </FormRow>
        </div>
    );
}

export default Insulation;
