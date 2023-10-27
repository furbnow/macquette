import React, { useId } from 'react';

import { SuspendedFloorSpec } from '../../../../../data-schemas/scenario/fabric/floor-u-value';
import { safeMerge } from '../../../../../helpers/safe-merge';
import { FormGrid, LabelWithInfo } from '../../../../input-components/forms';
import { NumberInput } from '../../../../input-components/number';
import { CombinedMethod } from '../shared-components/combined-method';
import type { Action as FloorUValueCalculatorAction } from '../state/reducer';

export type State = SuspendedFloorSpec;

type MergeState = {
  type: 'suspended floor/merge state';
  payload: Partial<State>;
};
export type Action = MergeState;

export function reducer(state: State, action: FloorUValueCalculatorAction): State {
  switch (action.type) {
    case 'suspended floor/merge state': {
      const newState = safeMerge(state, action.payload);
      // Special handling for layers array, since safeMerge will merge arrays
      if (action.payload.layers !== undefined) {
        newState.layers = action.payload.layers;
      }
      return newState;
    }
  }
  return state;
}

type Props = { state: State; dispatch: React.Dispatch<FloorUValueCalculatorAction> };
export function Component({ state, dispatch }: Props) {
  const ventilationId = useId();
  const underFloorId = useId();

  return (
    <>
      <FormGrid>
        <LabelWithInfo
          htmlFor={ventilationId}
          infoText={
            <>
              <p>
                The total area of ventilation below a suspended floor is the total
                &lsquo;equivalent area&rsquo; provided by subfloor air bricks or other
                vents and openings. You can work this out for a given floor by counting
                all the air bricks and vents present multiplying this by the estimated
                area of ventilation they provide.
              </p>
              <p>
                For example four air bricks of 1300 mm² free air space each equates to
                5200 mm² in this input.
              </p>
            </>
          }
        >
          Total area of ventilation points
        </LabelWithInfo>
        <NumberInput
          id={ventilationId}
          value={
            state.ventilationCombinedArea === null
              ? null
              : state.ventilationCombinedArea * 1_000_000
          }
          onChange={(value) =>
            dispatch({
              type: 'suspended floor/merge state',
              payload: {
                ventilationCombinedArea: value === null ? null : value / 1_000_000,
              },
            })
          }
          unit="mm²"
        />
        <LabelWithInfo
          htmlFor={underFloorId}
          infoText={
            <>
              The perimeter of an underfloor space should be measured as the entire
              perimeter of the space, including any party walls, as it is assumed these
              will also give onto unheated space. Note that this differs from the{' '}
              <em>exposed</em> perimeter of a ground floor, which does not include party
              walls and only includes the perimeter adjacent to the external environment
              or unheated spaces.
            </>
          }
        >
          Perimeter of underfloor space
        </LabelWithInfo>
        <NumberInput
          id={underFloorId}
          value={state.underFloorSpacePerimeter}
          onChange={(value) =>
            dispatch({
              type: 'suspended floor/merge state',
              payload: { underFloorSpacePerimeter: value },
            })
          }
          unit="m"
        />
      </FormGrid>

      {
        <CombinedMethod
          layers={state.layers}
          onChange={(layers) =>
            dispatch({
              type: 'suspended floor/merge state',
              payload: { layers },
            })
          }
        />
      }
    </>
  );
}
