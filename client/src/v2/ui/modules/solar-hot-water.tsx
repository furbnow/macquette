import { pick } from 'lodash';
import React from 'react';

import { SolarHotWaterV1 } from '../../data-schemas/scenario/solar-hot-water';
import { assertNever } from '../../helpers/assert-never';
import { Result } from '../../helpers/result';
import { DeepPartial, safeMerge } from '../../helpers/safe-merge';
import { CombinedModules } from '../../model/combined-modules';
import { Orientation } from '../../model/enums/orientation';
import { Overshading } from '../../model/enums/overshading';
import { CheckboxInput } from '../input-components/checkbox';
import { FormGrid, InfoTooltip } from '../input-components/forms';
import { NumberInput, NumberInputProps } from '../input-components/number';
import { Select, SelectProps } from '../input-components/select';
import type { Dispatcher } from '../module-management/module-type';
import { UiModule } from '../module-management/module-type';
import { LockedWarning } from '../output-components/locked-warning';
import { NumberOutput } from '../output-components/numeric';

type ModelOutputs = {
    aStar: number;
    collectorPerformanceRatio: number;
    annualSolarRadiation: number; // kWh/m^2
    availableSolarEnergy: number;
    utilisation: {
        load: number; // kWh
        solarToLoadRatio: number;
        utilisationFactor: number;
        collectorPerformanceFactor: number;
        effectiveSolarVolume: number; // litres
        dailyHotWaterDemand: number; // litres
        volumeRatio: number;
        solarStorageVolumeFactor: number;
        annualSolarInput: number; // kWh (the main output of the model -- total annual energy contribution of solar to hot water)
    };
};

export type LoadedState = {
    scenarioLocked: boolean;
    moduleEnabled: boolean;
    showAllCalcs: boolean;
    modelOutput: null | ModelOutputs;
    modelInput: SolarHotWaterV1['input'];
    pumpType: 'PV' | 'electric' | null;
};

type State = LoadedState | 'loading';

const emptyModelInput: SolarHotWaterV1['input'] = {
    collector: {
        parameterSource: null,
        apertureArea: null,
        testCertificate: {
            zeroLossEfficiency: null,
            linearHeatLossCoefficient: null,
            secondOrderHeatLossCoefficient: null,
        },
        estimate: {
            collectorType: null,
            apertureAreaType: null,
        },
        orientation: null,
        inclination: null,
        overshading: null,
    },
    dedicatedSolarStorageVolume: null,
    combinedCylinderVolume: null,
};

type Action =
    | ({ type: 'external data update'; model: CombinedModules | null } & Pick<
          LoadedState,
          'scenarioLocked' | 'moduleEnabled' | 'modelInput' | 'pumpType'
      >)
    | {
          type: 'merge state';
          toMerge: DeepPartial<Exclude<LoadedState, 'scenarioLocked'>>;
      };

export const solarHotWaterModule: UiModule<State, Action, never> = {
    name: 'solar hot water',
    initialState: () => {
        return 'loading';
    },
    reducer: (state: State, action: Action): [State] => {
        switch (action.type) {
            case 'external data update': {
                let modelOutput: LoadedState['modelOutput'];

                if (action.model === null || action.model.solarHotWater.type === 'noop') {
                    modelOutput = null;
                } else {
                    const { solarHotWater, waterCommon } = action.model;
                    modelOutput = {
                        aStar: solarHotWater.aStar,
                        collectorPerformanceRatio:
                            solarHotWater.collectorPerformanceRatio,
                        annualSolarRadiation: solarHotWater.solarRadiationAnnual,
                        availableSolarEnergy: solarHotWater.solarEnergyAvailable,
                        utilisation: {
                            load: waterCommon.hotWaterEnergyContentAnnual,
                            solarToLoadRatio: solarHotWater.solarToLoadRatio,
                            utilisationFactor: solarHotWater.utilisationFactor,
                            collectorPerformanceFactor:
                                solarHotWater.collectorPerformanceFactor,
                            effectiveSolarVolume: solarHotWater.effectiveSolarVolume,
                            dailyHotWaterDemand: waterCommon.dailyHotWaterUsageMeanAnnual,
                            volumeRatio: solarHotWater.volumeRatio,
                            solarStorageVolumeFactor:
                                solarHotWater.solarStorageVolumeFactor,
                            annualSolarInput: solarHotWater.solarInputAnnual,
                        },
                    };
                }
                return [
                    {
                        showAllCalcs: state !== 'loading' ? state.showAllCalcs : false,
                        ...pick(action, [
                            'scenarioLocked',
                            'moduleEnabled',
                            'modelInput',
                            'pumpType',
                        ]),
                        modelOutput,
                    },
                ];
            }
            case 'merge state': {
                if (state === 'loading') {
                    return [state];
                }
                return [safeMerge(state, action.toMerge)];
            }
        }
    },
    effector: assertNever,
    shims: {
        extractUpdateAction: ({ currentScenario, currentModel }) => {
            const { SHW, use_SHW } = currentScenario ?? {};
            const scenarioLocked = currentScenario?.locked ?? false;
            const moduleEnabled = use_SHW === true;
            const modelInput: SolarHotWaterV1['input'] = SHW?.input ?? emptyModelInput;
            const pumpType = SHW?.pump ?? null;
            return Result.ok({
                type: 'external data update',
                model: currentModel.isErr() ? null : currentModel.unwrap(),
                scenarioLocked,
                moduleEnabled,
                modelInput,
                pumpType,
            });
        },
        mutateLegacyData: ({ project, scenarioId }, state) => {
            if (state === 'loading') return;
            const { moduleEnabled, pumpType, modelInput } = state;
            const newSHW: SolarHotWaterV1 = {
                version: 1,
                input: modelInput,
                pump: pumpType ?? undefined,
            };
            /* eslint-disable
               @typescript-eslint/consistent-type-assertions,
               @typescript-eslint/no-explicit-any,
               @typescript-eslint/no-unsafe-assignment,
               @typescript-eslint/no-unsafe-member-access,
            */
            const dataAny = (project as any).data[scenarioId as any];
            dataAny.SHW = newSHW;
            dataAny.use_SHW = moduleEnabled;
            dataAny.water_heating = dataAny.water_heating ?? {};
            dataAny.water_heating.solar_water_heating = moduleEnabled;
            /* eslint-enable */
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
        <Select
            {...props}
            disabled={!enabled || locked}
            style={{ width: 'max-content' }}
        />
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
    dispatchMerge,
}: {
    collectorState: LoadedState['modelInput']['collector'];
    dispatchMerge: (partialNewState: DeepPartial<LoadedState>) => void;
}) {
    if (collectorState.parameterSource !== 'test certificate') {
        return <></>;
    }

    return (
        <>
            <label htmlFor="area">Aperture area of solar collector</label>
            <MyNumberInput
                id="area"
                value={collectorState.apertureArea}
                unit="m²"
                onChange={(value) =>
                    dispatchMerge({
                        modelInput: {
                            collector: {
                                apertureArea: value,
                            },
                        },
                    })
                }
            />

            <label htmlFor="efficiency">
                Zero-loss collector efficiency, η<sub>0</sub>
            </label>
            <MyNumberInput
                id="efficiency"
                value={collectorState.testCertificate.zeroLossEfficiency}
                onChange={(value) =>
                    dispatchMerge({
                        modelInput: {
                            collector: {
                                testCertificate: {
                                    zeroLossEfficiency: value,
                                },
                            },
                        },
                    })
                }
            />

            <label htmlFor="linear-hlc">
                Collector linear heat loss coefficient, a<sub>1</sub>
            </label>
            <MyNumberInput
                id="linear-hlc"
                value={collectorState.testCertificate.linearHeatLossCoefficient}
                onChange={(value) =>
                    dispatchMerge({
                        modelInput: {
                            collector: {
                                testCertificate: {
                                    linearHeatLossCoefficient: value,
                                },
                            },
                        },
                    })
                }
            />

            <label htmlFor="2nd-hlc">
                Collector 2nd order heat loss coefficient, a<sub>2</sub>
            </label>
            <MyNumberInput
                id="2nd-hlc"
                value={collectorState.testCertificate.secondOrderHeatLossCoefficient}
                onChange={(value) =>
                    dispatchMerge({
                        modelInput: {
                            collector: {
                                testCertificate: {
                                    secondOrderHeatLossCoefficient: value,
                                },
                            },
                        },
                    })
                }
            />
        </>
    );
}

function EstimatedParameters({
    collectorState,
    dispatchMerge,
}: {
    collectorState: LoadedState['modelInput']['collector'];
    dispatchMerge: (partialNewState: DeepPartial<LoadedState>) => void;
}) {
    if (collectorState.parameterSource !== 'estimate') {
        return <></>;
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
                value={collectorState.estimate.collectorType}
                onChange={(value) =>
                    dispatchMerge({
                        modelInput: {
                            collector: {
                                estimate: { collectorType: value },
                            },
                        },
                    })
                }
            />

            <label htmlFor="aperture">Aperture area of solar collector</label>
            <span>
                <MyNumberInput
                    id="aperture"
                    value={collectorState.apertureArea}
                    unit="m²"
                    onChange={(value) =>
                        dispatchMerge({
                            modelInput: {
                                collector: {
                                    apertureArea: value,
                                },
                            },
                        })
                    }
                />{' '}
                <MySelect
                    options={[
                        { value: 'exact', display: 'exact' },
                        { value: 'gross', display: 'gross' },
                    ]}
                    value={collectorState.estimate.apertureAreaType}
                    onChange={(value) =>
                        dispatchMerge({
                            modelInput: {
                                collector: {
                                    estimate: { apertureAreaType: value },
                                },
                            },
                        })
                    }
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
    if (state === 'loading') {
        return <>Loading...</>;
    }

    function dispatchMerge(partialNewState: DeepPartial<LoadedState>) {
        return dispatch({ type: 'merge state', toMerge: partialNewState });
    }

    const { showAllCalcs, moduleEnabled, scenarioLocked, modelOutput } = state;

    return (
        <PageContext.Provider value={{ locked: scenarioLocked, enabled: moduleEnabled }}>
            <LockedWarning locked={scenarioLocked} />
            <h3>Solar Hot Water system</h3>

            <FormGrid>
                <label htmlFor="use-shw">Use a solar hot water system</label>
                <span>
                    <CheckboxInput
                        id="use-shw"
                        value={moduleEnabled}
                        onChange={(checked) => dispatchMerge({ moduleEnabled: checked })}
                        readOnly={scenarioLocked}
                    />
                </span>

                <span></span>
                <span>
                    <button
                        className="btn mb-15"
                        onClick={() => dispatchMerge({ showAllCalcs: !showAllCalcs })}
                    >
                        {showAllCalcs
                            ? 'Hide full calculations'
                            : 'Show full calculations'}
                    </button>
                </span>

                <label htmlFor="pump">Solar water heating pump</label>
                <MySelect
                    id="pump"
                    options={[
                        { value: 'PV', display: 'PV powered' },
                        { value: 'electric', display: 'Electrically powered' },
                    ]}
                    value={state.pumpType}
                    onChange={(value) => dispatchMerge({ pumpType: value })}
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
                    value={state.modelInput.collector.parameterSource}
                    onChange={(value) =>
                        dispatchMerge({
                            modelInput: {
                                collector: { parameterSource: value },
                            },
                        })
                    }
                />

                <TestCertificateParameters
                    collectorState={state.modelInput.collector}
                    dispatchMerge={dispatchMerge}
                />
                <EstimatedParameters
                    collectorState={state.modelInput.collector}
                    dispatchMerge={dispatchMerge}
                />

                {showAllCalcs && (
                    <>
                        <span>
                            a*
                            <InfoTooltip>
                                = 0.892 × (a<sub>1</sub> + 45a<sub>2</sub>)
                            </InfoTooltip>
                        </span>
                        <NumberOutput value={modelOutput?.aStar} />

                        <span>
                            Collector performance ratio
                            <InfoTooltip>
                                = a*/η<sub>0</sub>
                            </InfoTooltip>
                        </span>
                        <NumberOutput value={modelOutput?.collectorPerformanceRatio} />

                        <span>
                            Annual solar radiation per m²
                            <InfoTooltip>
                                from U3.3 in Appendix U for the orientation and tilt of
                                the collector
                            </InfoTooltip>
                        </span>
                        <NumberOutput
                            value={modelOutput?.annualSolarRadiation}
                            unit={'kWh'}
                        />
                    </>
                )}

                <label htmlFor="orientation">Collector orientation</label>
                <MySelect
                    id="orientation"
                    options={Orientation.names.map((orientationName) => ({
                        value: orientationName,
                        display: orientationName,
                    }))}
                    value={state.modelInput.collector.orientation}
                    onChange={(value) =>
                        dispatchMerge({
                            modelInput: {
                                collector: { orientation: value },
                            },
                        })
                    }
                />

                <label htmlFor="inclination">Collector inclination</label>
                <MyNumberInput
                    id="inclination"
                    value={state.modelInput.collector.inclination}
                    unit={'degrees'}
                    onChange={(value) =>
                        dispatchMerge({
                            modelInput: {
                                collector: { inclination: value },
                            },
                        })
                    }
                />

                <label htmlFor="overshadowing">Overshading factor</label>
                <MySelect
                    id="overshadowing"
                    options={Overshading.all.map(({ name, display }) => ({
                        value: name,
                        display,
                    }))}
                    value={state.modelInput.collector.overshading}
                    onChange={(value) =>
                        dispatchMerge({
                            modelInput: {
                                collector: { overshading: value },
                            },
                        })
                    }
                />

                {showAllCalcs && (
                    <>
                        <span>Solar energy available</span>
                        <NumberOutput
                            value={modelOutput?.availableSolarEnergy}
                            unit={'kWh'}
                        />

                        <span>Solar-to-load ratio</span>
                        <NumberOutput value={modelOutput?.utilisation.solarToLoadRatio} />

                        <span>Utilisation factor</span>
                        <NumberOutput
                            value={modelOutput?.utilisation.utilisationFactor}
                        />

                        <span>Collector performance factor</span>
                        <NumberOutput
                            value={modelOutput?.utilisation.collectorPerformanceFactor}
                        />
                    </>
                )}

                <label htmlFor="dedicated-volume">
                    Dedicated solar storage volume (enter 0 if none)
                </label>
                <MyNumberInput
                    id="dedicated-volume"
                    value={state.modelInput.dedicatedSolarStorageVolume}
                    unit="litres"
                    onChange={(value) =>
                        dispatchMerge({
                            modelInput: {
                                dedicatedSolarStorageVolume: value,
                            },
                        })
                    }
                />

                <label htmlFor="combined-cylinder">
                    If combined cylinder, total volume of cylinder
                </label>
                <MyNumberInput
                    id="combined-cylinder"
                    value={state.modelInput.combinedCylinderVolume}
                    unit="litres"
                    onChange={(value) =>
                        dispatchMerge({
                            modelInput: { combinedCylinderVolume: value },
                        })
                    }
                />

                {showAllCalcs && (
                    <>
                        <span>
                            Effective solar volume, V<sub>eff</sub>
                        </span>
                        <NumberOutput
                            value={modelOutput?.utilisation.effectiveSolarVolume}
                            unit={'litres'}
                        />

                        <span>
                            Daily hot water demand, V<sub>d,average</sub> [from heating
                            page]
                        </span>
                        <NumberOutput
                            value={modelOutput?.utilisation.dailyHotWaterDemand}
                            unit={'litres'}
                        />

                        <span>
                            Volume ratio V<sub>eff</sub>/V<sub>d,average</sub>
                        </span>
                        <NumberOutput value={modelOutput?.utilisation.volumeRatio} />

                        <span>
                            Solar storage volume factor
                            <InfoTooltip>
                                f<sub>2</sub> = 1 + 0.2 × ln(Volume Ratio)
                            </InfoTooltip>
                        </span>
                        <NumberOutput
                            value={modelOutput?.utilisation.solarStorageVolumeFactor}
                        />
                    </>
                )}

                <span>
                    Annual solar input Q<sub>s</sub>
                </span>
                <NumberOutput
                    value={modelOutput?.utilisation.annualSolarInput}
                    unit={'kWh'}
                />
            </FormGrid>
        </PageContext.Provider>
    );
}
