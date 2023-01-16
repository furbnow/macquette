import React, { useId } from 'react';

import { InsulationSpec } from '../../../../../data-schemas/scenario/fabric/floor-u-value';
import { NumericInput } from '../../../../input-components/numeric';
import { MaterialSelector } from './material-selector';

type InsulationInputProps = {
    thicknessMandatory?: boolean;
    currentValue: InsulationSpec;
    onChange: (value: Partial<InsulationSpec>) => void;
};

export function InsulationInput({
    thicknessMandatory,
    currentValue,
    onChange,
}: InsulationInputProps) {
    const thicknessId = useId();
    const materialId = useId();
    const { material, thickness } = currentValue;
    const thicknessRequired =
        thicknessMandatory === true ||
        currentValue.material?.mechanism === 'conductivity';
    return (
        <>
            <label htmlFor={thicknessId}>Thickness</label>
            <NumericInput
                id={thicknessId}
                disabled={!thicknessRequired}
                value={thicknessRequired && thickness !== null ? thickness * 1000 : null}
                callback={(value) =>
                    onChange({
                        thickness: value === null ? null : value / 1000,
                    })
                }
                unit="mm"
            />
            <label htmlFor={materialId}>Material</label>
            <MaterialSelector
                selectButtonId={materialId}
                value={material}
                onChange={(material) =>
                    onChange({
                        material,
                    })
                }
            />
        </>
    );
}
