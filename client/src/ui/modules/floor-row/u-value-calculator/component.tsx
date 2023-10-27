import { partition } from 'lodash';
import objectInspect from 'object-inspect';
import React from 'react';

import {
  FloorType,
  PerFloorTypeSpec,
} from '../../../../data-schemas/scenario/fabric/floor-u-value';
import { Floor } from '../../../../model/modules/fabric/element-types';
import { severity } from '../../../../model/modules/fabric/floor-u-value-calculator/warnings';
import { partialBem } from '../../../bem';
import * as exposedFloor from './floor-types/exposed';
import * as heatedBasementFloor from './floor-types/heated-basement';
import * as solidFloor from './floor-types/solid-bs13370';
import * as suspendedFloor from './floor-types/suspended';
import { floorTypeDisplay } from './shared-components/floor-type-display';
import { Action, reducer } from './state/reducer';
import { warningDisplay } from './warnings';

type ControlledComponentProps<S> = {
  value: S;
  onChange: (newValue: S) => void;
};

type FUVCProps = ControlledComponentProps<PerFloorTypeSpec> & {
  modelElement: Floor | null;
  selectedFloorType: Exclude<FloorType, 'custom'>;
  suppressNonFiniteNumberErrors: boolean;
};

const fuvcBem = partialBem('floor-u-value-calculator');

export function FUVC({
  value,
  onChange,
  modelElement,
  selectedFloorType,
  suppressNonFiniteNumberErrors,
}: FUVCProps) {
  function dispatch(action: Action) {
    onChange(reducer({ ...value, selectedFloorType }, action));
  }
  const [errors, warnings] = partition(
    [...(modelElement?.warnings ?? []), ...(modelElement?.uValueModel.warnings ?? [])],
    (w) => severity(w) === 'high',
  );
  const warningsDisplay = warnings
    .map((warning) => warningDisplay(warning) ?? objectInspect(warning))
    .map((element, idx) => (
      <div key={idx} className="alert alert-warning">
        {element}
      </div>
    ));
  const errorsDisplay = errors
    .filter(
      (e) => !suppressNonFiniteNumberErrors || e.type !== 'non-finite number replaced',
    )
    .map((err) => warningDisplay(err) ?? objectInspect(err))
    .map((element, idx) => (
      <div key={idx} className="alert alert-error">
        {element}
      </div>
    ));
  return (
    <div className={fuvcBem('root')}>
      <div className={fuvcBem('grid')}>
        {selectedFloorType === 'solid' && (
          <div>
            Solid floor U-value calculation from tables is no longer supported; existing
            data has not been lost but is no longer visible here. To use the new method
            for solid floors, select select floor type &quot;
            {floorTypeDisplay('solid (bs13370)')}
            &quot; and recalculate.
          </div>
        )}

        {selectedFloorType === 'solid (bs13370)' && (
          <solidFloor.Component state={value['solid (bs13370)']} dispatch={dispatch} />
        )}

        {selectedFloorType === 'suspended' && (
          <suspendedFloor.Component state={value.suspended} dispatch={dispatch} />
        )}

        {selectedFloorType === 'heated basement' && (
          <heatedBasementFloor.Component
            state={value['heated basement']}
            dispatch={dispatch}
          />
        )}

        {selectedFloorType === 'exposed' && (
          <exposedFloor.Component state={value.exposed} dispatch={dispatch} />
        )}
      </div>

      {warningsDisplay.length !== 0 && (
        <div className={fuvcBem('warning-display')}>{warningsDisplay}</div>
      )}
      {errorsDisplay.length !== 0 && (
        <div className={fuvcBem('error-display')}>{errorsDisplay}</div>
      )}
    </div>
  );
}
