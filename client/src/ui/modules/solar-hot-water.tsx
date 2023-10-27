import React, { useState } from 'react';
import { z } from 'zod';
import { projectSchema } from '../../data-schemas/project';
import { SolarHotWaterSchema } from '../../data-schemas/scenario/solar-hot-water';
import {
  SolarHotWaterDataModel,
  solarHotWaterDataModel,
} from '../../data-schemas/scenario/solar-hot-water/v2';
import {
  FormStateOf,
  makeFormStateTransforms,
} from '../../data-schemas/visitable-types/form-state';
import { assertNever } from '../../helpers/assert-never';
import { Result } from '../../helpers/result';
import { DeepPartial, safeMerge } from '../../helpers/safe-merge';
import { CombinedModules } from '../../model/combined-modules';
import { Orientation } from '../../model/enums/orientation';
import { Overshading } from '../../model/enums/overshading';
import {
  SolarHotWaterEnabled,
  SolarHotWater as SolarHotWaterModel,
} from '../../model/modules/solar-hot-water';
import { WaterCommon } from '../../model/modules/water-common';
import { CheckboxInput } from '../input-components/checkbox';
import { FormGrid, InfoTooltip } from '../input-components/forms';
import { NumberInput, NumberInputProps } from '../input-components/number';
import { Select, SelectProps } from '../input-components/select';
import type { Dispatcher } from '../module-management/module-type';
import { UiModule } from '../module-management/module-type';
import { NumberOutput } from '../output-components/numeric';

type InputState = FormStateOf<typeof solarHotWaterDataModel>;
const { fromFormState, toFormState } = makeFormStateTransforms(solarHotWaterDataModel);

export type LoadedState = {
  scenarioLocked: boolean;
  combinedModules: null | {
    solarHotWater: SolarHotWaterModel;
    waterCommon: WaterCommon;
  };
  input: InputState;
};

type State = LoadedState | 'loading';

type Action =
  | { type: 'set outputs'; model: CombinedModules }
  | { type: 'reset inputs'; scenarioLocked: boolean; input: SolarHotWaterDataModel }
  | { type: 'merge inputs'; toMerge: DeepPartial<InputState> };

export const solarHotWaterModule: UiModule<State, Action, never> = {
  name: 'solar hot water',
  initialState: () => {
    return 'loading';
  },
  reducer: (state: State, action: Action): [State] => {
    if (action.type === 'reset inputs') {
      return [
        {
          scenarioLocked: action.scenarioLocked,
          input: toFormState(action.input),
          combinedModules: null,
        },
      ];
    }
    if (state === 'loading') return [state];
    if (action.type === 'set outputs') {
      return [{ ...state, combinedModules: action.model }];
    }
    switch (action.type) {
      case 'merge inputs': {
        const newState = safeMerge(state, { input: action.toMerge });
        return [newState];
      }
      default: {
        return assertNever(action);
      }
    }
  },
  effector: assertNever,
  shims: {
    extractUpdateAction: (
      { currentScenario, currentModel },
      _instanceKey,
      { inputs, outputs },
    ) => {
      const { SHW } = currentScenario ?? {};
      const scenarioLocked = currentScenario?.locked ?? false;
      const actions: Action[] = [];
      if (inputs) {
        actions.push({
          type: 'reset inputs',
          scenarioLocked,
          input: SHW?.input ?? null,
        });
      }
      if (outputs && currentModel.isOk()) {
        actions.push({
          type: 'set outputs',
          model: currentModel.coalesce(),
        });
      }
      return Result.ok(actions);
    },
    mutateLegacyData: ({ project }, { scenarioId }, state) => {
      if (state === 'loading') return;
      const { input } = state;
      const moduleEnabled = input !== null && input.isNull !== true;
      const newSHW: SolarHotWaterSchema = {
        version: 2,
        input: fromFormState(input),
      };
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const project_ = project as z.input<typeof projectSchema>;
      if (scenarioId === null) {
        console.error('scenarioId was null');
        return;
      }
      const scenario = project_.data[scenarioId];
      if (scenario === undefined) {
        console.error('scenario was undefined');
        return;
      }
      scenario.SHW = newSHW;
      scenario.use_SHW = moduleEnabled;
      scenario.water_heating = scenario.water_heating ?? {};
      scenario.water_heating.solar_water_heating = moduleEnabled;
    },
  },
  component: SolarHotWater,
};

type PageContextInterface = {
  locked: boolean;
  enabled: boolean;
};

export const PageContext = React.createContext<PageContextInterface>({
  locked: false,
  enabled: false,
});

function MySelect<T extends string>(props: Omit<SelectProps<T>, 'disabled' | 'style'>) {
  const { locked, enabled } = React.useContext(PageContext);

  return (
    <Select {...props} disabled={!enabled || locked} style={{ width: 'max-content' }} />
  );
}

function MyNumberInput(props: Omit<NumberInputProps, 'readOnly' | 'style'>) {
  const { locked, enabled } = React.useContext(PageContext);

  return (
    <NumberInput {...props} readOnly={!enabled || locked} style={{ width: '50px' }} />
  );
}

function TestCertificateParameters({
  collectorState,
  dispatch,
}: {
  collectorState: NonNullable<NonNullable<InputState>['value']>['collector'];
  dispatch: (action: Action) => void;
}) {
  if (
    collectorState === null ||
    collectorState.parameters?.selected !== 'test certificate'
  ) {
    return <></>;
  }
  const testCertificateState = collectorState.parameters.variants['test certificate'];

  function mergeTestCertificateInputs(toMerge: DeepPartial<typeof testCertificateState>) {
    dispatch({
      type: 'merge inputs',
      toMerge: {
        value: {
          collector: {
            parameters: {
              variants: {
                'test certificate': toMerge,
              },
            },
          },
        },
      },
    });
  }

  return (
    <>
      <label htmlFor="area">Aperture area of solar collector</label>
      <MyNumberInput
        id="area"
        value={collectorState.apertureArea}
        unit="m²"
        onChange={(value) =>
          dispatch({
            type: 'merge inputs',
            toMerge: { value: { collector: { apertureArea: value } } },
          })
        }
      />

      <label htmlFor="efficiency">Zero-loss collector efficiency, η₀</label>
      <MyNumberInput
        id="efficiency"
        value={testCertificateState?.zeroLossEfficiency ?? null}
        onChange={(value) => mergeTestCertificateInputs({ zeroLossEfficiency: value })}
      />

      <label htmlFor="linear-hlc">Collector linear heat loss coefficient, a₁</label>
      <MyNumberInput
        id="linear-hlc"
        value={testCertificateState?.linearHeatLossCoefficient ?? null}
        onChange={(value) =>
          mergeTestCertificateInputs({ linearHeatLossCoefficient: value })
        }
      />

      <label htmlFor="2nd-hlc">Collector 2nd order heat loss coefficient, a₂</label>
      <MyNumberInput
        id="2nd-hlc"
        value={testCertificateState?.secondOrderHeatLossCoefficient ?? null}
        onChange={(value) =>
          mergeTestCertificateInputs({ secondOrderHeatLossCoefficient: value })
        }
      />
    </>
  );
}

function EstimatedParameters({
  collectorState,
  dispatch,
}: {
  collectorState: NonNullable<NonNullable<InputState>['value']>['collector'];
  dispatch: (action: Action) => void;
}) {
  if (collectorState === null || collectorState.parameters?.selected !== 'estimate') {
    return <></>;
  }
  const estimateState = collectorState.parameters.variants['estimate'];
  function mergeEstimateInputs(toMerge: DeepPartial<typeof estimateState>) {
    dispatch({
      type: 'merge inputs',
      toMerge: {
        value: {
          collector: {
            parameters: {
              variants: {
                estimate: toMerge,
              },
            },
          },
        },
      },
    });
  }

  return (
    <>
      <label htmlFor="collector-type">Collector type</label>
      <MySelect
        id="collector-type"
        options={[
          { value: 'evacuated tube', display: 'Evacuated tube' },
          {
            value: 'flat plate, glazed',
            display: 'Flat plate, glazed',
          },
          { value: 'unglazed', display: 'Unglazed' },
        ]}
        value={estimateState?.collectorType ?? null}
        onChange={(value) => mergeEstimateInputs({ collectorType: value })}
      />

      <label htmlFor="aperture">Aperture area of solar collector</label>
      <span>
        <MyNumberInput
          id="aperture"
          value={collectorState.apertureArea}
          unit="m²"
          onChange={(value) =>
            value !== null &&
            dispatch({
              type: 'merge inputs',
              toMerge: { value: { collector: { apertureArea: value } } },
            })
          }
        />{' '}
        <MySelect
          options={[
            { value: 'exact', display: 'exact' },
            { value: 'gross', display: 'gross' },
          ]}
          value={estimateState?.apertureAreaType ?? null}
          onChange={(value) => mergeEstimateInputs({ apertureAreaType: value })}
        />
      </span>
    </>
  );
}

function SolarHotWater({
  state,
  dispatch,
}: {
  state: State;
  dispatch: Dispatcher<Action>;
}) {
  const [showAllCalcs, setShowAllCalcs] = useState<boolean>(false);
  if (state === 'loading') {
    return <>Loading...</>;
  }

  function mergeInputs(
    toMerge: DeepPartial<NonNullable<NonNullable<InputState>['value']>>,
  ) {
    dispatch({
      type: 'merge inputs',
      toMerge: {
        value: toMerge,
      },
    });
  }

  const { scenarioLocked, input, combinedModules } = state;
  let modelModule: null | SolarHotWaterEnabled = null;
  if (combinedModules?.solarHotWater instanceof SolarHotWaterEnabled) {
    modelModule = combinedModules?.solarHotWater;
  }

  return (
    <PageContext.Provider
      value={{ locked: scenarioLocked, enabled: input !== null && !input.isNull }}
    >
      <hr />
      <h3>Solar Hot Water system</h3>

      <FormGrid>
        <label htmlFor="use-shw">Use a solar hot water system</label>
        <span>
          <CheckboxInput
            id="use-shw"
            value={!(input?.isNull ?? false)}
            onChange={(checked) =>
              dispatch({
                type: 'merge inputs',
                toMerge: { isNull: !checked },
              })
            }
            readOnly={scenarioLocked}
          />
        </span>

        <span></span>
        <span>
          <button className="btn mb-15" onClick={() => setShowAllCalcs(!showAllCalcs)}>
            {showAllCalcs ? 'Hide full calculations' : 'Show full calculations'}
          </button>
        </span>

        <label htmlFor="pump">Solar water heating pump</label>
        <MySelect
          id="pump"
          options={[
            { value: 'PV', display: 'PV powered' },
            { value: 'electric', display: 'Electrically powered' },
          ]}
          value={input?.value?.pump ?? null}
          onChange={(value) => mergeInputs({ pump: value })}
        />

        <label htmlFor="parameter-source">Parameter source</label>
        <MySelect
          id="parameter-source"
          options={[
            {
              value: 'test certificate',
              display: 'Test Certificate',
            },
            { value: 'estimate', display: 'Estimated' },
          ]}
          value={input?.value?.collector?.parameters?.selected ?? null}
          onChange={(value) =>
            mergeInputs({
              collector: { parameters: { selected: value } },
            })
          }
        />

        <TestCertificateParameters
          collectorState={state.input?.value?.collector ?? null}
          dispatch={dispatch}
        />
        <EstimatedParameters
          collectorState={state.input?.value?.collector ?? null}
          dispatch={dispatch}
        />

        {showAllCalcs && (
          <>
            <span>
              a*
              <InfoTooltip>
                = 0.892 × (a<sub>1</sub> + 45a<sub>2</sub>)
              </InfoTooltip>
            </span>
            <NumberOutput value={modelModule?.aStar} />

            <span>
              Collector performance ratio
              <InfoTooltip>
                = a*/η<sub>0</sub>
              </InfoTooltip>
            </span>
            <NumberOutput value={modelModule?.collectorPerformanceRatio} />

            <span>
              Annual solar radiation per m²
              <InfoTooltip>
                from U3.3 in Appendix U for the orientation and tilt of the collector
              </InfoTooltip>
            </span>
            <NumberOutput value={modelModule?.solarRadiationAnnual} unit={'kWh'} />
          </>
        )}

        <label htmlFor="orientation">Collector orientation</label>
        <MySelect
          id="orientation"
          options={Orientation.names.map((orientationName) => ({
            value: orientationName,
            display: orientationName,
          }))}
          value={state.input?.value?.collector?.orientation ?? null}
          onChange={(value) =>
            mergeInputs({
              collector: {
                orientation: value,
              },
            })
          }
        />

        <label htmlFor="inclination">Collector inclination</label>
        <MyNumberInput
          id="inclination"
          value={state.input?.value?.collector?.inclination ?? null}
          unit={'degrees'}
          onChange={(value) =>
            mergeInputs({
              collector: { inclination: value },
            })
          }
        />

        <label htmlFor="overshading">Overshading factor</label>
        <MySelect
          id="overshading"
          options={Overshading.all.map(({ name, display }) => ({
            value: name,
            display,
          }))}
          value={state.input?.value?.collector?.overshading ?? null}
          onChange={(value) =>
            mergeInputs({
              collector: {
                overshading: value,
              },
            })
          }
        />

        {showAllCalcs && (
          <>
            <span>Solar energy available</span>
            <NumberOutput value={modelModule?.solarEnergyAvailable} unit={'kWh'} />

            <span>Solar-to-load ratio</span>
            <NumberOutput value={modelModule?.solarToLoadRatio} />

            <span>Utilisation factor</span>
            <NumberOutput value={modelModule?.utilisationFactor} />

            <span>Collector performance factor</span>
            <NumberOutput value={modelModule?.collectorPerformanceFactor} />
          </>
        )}

        <label htmlFor="dedicated-volume">
          Dedicated solar storage volume (enter 0 if none)
        </label>
        <MyNumberInput
          id="dedicated-volume"
          value={state.input?.value?.dedicatedSolarStorageVolume ?? null}
          unit="litres"
          onChange={(value) => mergeInputs({ dedicatedSolarStorageVolume: value })}
        />

        <label htmlFor="combined-cylinder">
          If combined cylinder, total volume of cylinder
        </label>
        <MyNumberInput
          id="combined-cylinder"
          value={state.input?.value?.combinedCylinderVolume ?? null}
          unit="litres"
          onChange={(value) =>
            mergeInputs({
              combinedCylinderVolume: value,
            })
          }
        />

        {showAllCalcs && (
          <>
            <span>
              Effective solar volume, V<sub>eff</sub>
            </span>
            <NumberOutput value={modelModule?.effectiveSolarVolume} unit={'litres'} />

            <span>
              Daily hot water demand, V<sub>d,average</sub> [from heating page]
            </span>
            <NumberOutput
              value={combinedModules?.waterCommon?.dailyHotWaterUsageMeanAnnual}
              unit={'litres'}
            />

            <span>
              Volume ratio V<sub>eff</sub>/V<sub>d,average</sub>
            </span>
            <NumberOutput value={modelModule?.volumeRatio} />

            <span>
              Solar storage volume factor
              <InfoTooltip>
                f<sub>2</sub> = 1 + 0.2 × ln(Volume Ratio)
              </InfoTooltip>
            </span>
            <NumberOutput value={modelModule?.solarStorageVolumeFactor} />
          </>
        )}

        <span>
          Annual solar input Q<sub>s</sub>
        </span>
        <NumberOutput value={modelModule?.solarInputAnnual} unit={'kWh'} />
      </FormGrid>
    </PageContext.Provider>
  );
}
