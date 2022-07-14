import React, { useId } from 'react';

import { InsulationSpec } from '../../../../../data-schemas/scenario/fabric/floor-u-value';
import { NumericInput } from '../../../../input-components/numeric';
import { MaterialSelector } from './material-selector';

type InsulationInputProps = {
    indent?: boolean;
    currentValue: InsulationSpec;
    onChange: (value: Partial<InsulationSpec>) => void;
};

export function InsulationInput({ currentValue, onChange }: InsulationInputProps) {
    const thicknessId = useId();
    const materialId = useId();
    const { thickness, material } = currentValue;
    return (
        <>
            <label htmlFor={thicknessId}>Thickness</label>
            <NumericInput
                id={thicknessId}
                value={thickness === null ? null : thickness * 1000}
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
