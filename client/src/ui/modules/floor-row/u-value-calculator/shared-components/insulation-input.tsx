import React, { useId } from 'react';

import { InsulationSpec } from '../../../../../data-schemas/scenario/fabric/floor-u-value';
import { NumberInput } from '../../../../input-components/number';
import { MaterialSelector } from './material-selector';

type InsulationInputProps = {
  thicknessMandatory?: boolean;
  thicknessLabel?: string;
  materialLabel?: string;
  currentValue: InsulationSpec;
  onChange: (value: Partial<InsulationSpec>) => void;
};

export function InsulationInput({
  thicknessMandatory,
  thicknessLabel,
  materialLabel,
  currentValue,
  onChange,
}: InsulationInputProps) {
  const thicknessId = useId();
  const materialId = useId();
  const { material, thickness } = currentValue;
  const thicknessRequired =
    thicknessMandatory === true || currentValue.material?.mechanism === 'conductivity';
  return (
    <>
      <label htmlFor={thicknessId}>{thicknessLabel ?? 'Thickness'}</label>
      <NumberInput
        id={thicknessId}
        disabled={!thicknessRequired}
        value={thicknessRequired && thickness !== null ? thickness * 1000 : null}
        onChange={(value) =>
          onChange({
            thickness: value === null ? null : value / 1000,
          })
        }
        unit="mm"
      />
      <label htmlFor={materialId}>{materialLabel ?? 'Material'}</label>
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
