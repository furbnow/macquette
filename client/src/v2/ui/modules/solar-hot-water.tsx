import { pick } from 'lodash';
import React from 'react';

import { SolarHotWaterV1 } from '../../data-schemas/scenario/solar-hot-water';
import { assertNever } from '../../helpers/assert-never';
import { PropsOf } from '../../helpers/props-of';
import { Result } from '../../helpers/result';
import { DeepPartial, safeMerge } from '../../helpers/safe-merge';
import { Shadow } from '../../helpers/shadow-object-type';
import { CombinedModules } from '../../model/combined-modules';
import { Orientation } from '../../model/enums/orientation';
import { Overshading } from '../../model/enums/overshading';
import { CheckboxInput } from '../input-components/checkbox';
import { NumericInput, NumericInputProps } from '../input-components/numeric';
import { Select, SelectProps } from '../input-components/select';
import { UiModule } from '../module-management/module-type';
import { LockedWarning } from '../output-components/locked-warning';
import {
    noOutput,
    NumericOutput,
    NumericOutputProps,
} from '../output-components/numeric';

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
    modelOutput: null | ModelOutputs;
    modelInput: SolarHotWaterV1['input'];
    pumpType: 'PV' | 'electric' | null;
};

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
    | ({ type: 'external data update'; model: CombinedModules } & Pick<
          LoadedState,
          'scenarioLocked' | 'moduleEnabled' | 'modelInput' | 'pumpType'
      >)
    | {
          type: 'merge state';
          toMerge: DeepPartial<Exclude<LoadedState, 'scenarioLocked'>>;
      };

export const solarHotWaterModule: UiModule<LoadedState | 'loading', Action, never> = {
    name: 'solar hot water',
    initialState: () => {
        return 'loading';
    },
    reducer: (state, action) => {
        switch (action.type) {
            case 'external data update': {
                const { solarHotWater, waterCommon } = action.model;
                let modelOutput: LoadedState['modelOutput'];
                if (solarHotWater.type === 'noop') {
                    modelOutput = null;
                } else {
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
                model: currentModel,
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
    component: function SolarHotWater({ state, dispatch }) {
        function dispatchMerge(partialNewState: DeepPartial<LoadedState>) {
            return dispatch({ type: 'merge state', toMerge: partialNewState });
        }
        if (state === 'loading') {
            return <>Loading...</>;
        }
        const { moduleEnabled, scenarioLocked, modelOutput } = state;
        function MySelect<T extends string>(
            props: Omit<SelectProps<T>, 'disabled' | 'style'>,
        ) {
            return (
                <Select
                    {...props}
                    disabled={!moduleEnabled || scenarioLocked}
                    style={{ width: 'max-content', marginBottom: 0 }}
                />
            );
        }
        function MyNumericInput(props: Omit<NumericInputProps, 'readOnly' | 'style'>) {
            return (
                <NumericInput
                    {...props}
                    readOnly={!moduleEnabled || scenarioLocked}
                    style={{ width: '50px', marginBottom: 0 }}
                />
            );
        }
        function MyNumericOutput(
            props: Shadow<
                NumericOutputProps,
                {
                    value: number | undefined;
                }
            >,
        ) {
            return <NumericOutput {...props} value={props.value ?? noOutput} />;
        }
        function MyTd(props: Omit<PropsOf<'td'>, 'style'>) {
            return <td {...props} style={{ verticalAlign: 'middle' }} />;
        }
        function TestCertificateParameters() {
            if (
                state === 'loading' ||
                state.modelInput.collector === undefined ||
                state.modelInput.collector.parameterSource !== 'test certificate'
            ) {
                return <></>;
            }
            return (
                <>
                    <tr>
                        <MyTd>Aperture area of solar collector</MyTd>
                        <MyTd>
                            <MyNumericInput
                                value={state.modelInput.collector.apertureArea}
                                callback={(value) =>
                                    dispatchMerge({
                                        modelInput: {
                                            collector: {
                                                apertureArea: value,
                                            },
                                        },
                                    })
                                }
                            />{' '}
                            m²
                        </MyTd>
                    </tr>
                    <tr>
                        <MyTd>
                            Zero-loss collector efficiency, η<sub>0</sub>
                        </MyTd>
                        <MyTd>
                            <MyNumericInput
                                value={
                                    state.modelInput.collector.testCertificate
                                        .zeroLossEfficiency
                                }
                                callback={(value) =>
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
                        </MyTd>
                    </tr>

                    <tr>
                        <MyTd>
                            Collector linear heat loss coefficient, a<sub>1</sub>
                        </MyTd>
                        <MyTd>
                            <MyNumericInput
                                value={
                                    state.modelInput.collector.testCertificate
                                        .linearHeatLossCoefficient
                                }
                                callback={(value) =>
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
                        </MyTd>
                    </tr>

                    <tr>
                        <MyTd>
                            Collector 2nd order heat loss coefficient, a<sub>2</sub>
                        </MyTd>
                        <MyTd>
                            <MyNumericInput
                                value={
                                    state.modelInput.collector.testCertificate
                                        .secondOrderHeatLossCoefficient
                                }
                                callback={(value) =>
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
                        </MyTd>
                    </tr>
                </>
            );
        }
        function EstimatedParameters() {
            if (
                state === 'loading' ||
                state.modelInput.collector.parameterSource !== 'estimate'
            ) {
                return <></>;
            }
            return (
                <>
                    <tr>
                        <MyTd>Collector type</MyTd>
                        <MyTd>
                            <MySelect
                                options={[
                                    {
                                        value: 'evacuated tube',
                                        display: 'Evacuated tube',
                                    },
                                    {
                                        value: 'flat plate, glazed',
                                        display: 'Flat plate, glazed',
                                    },
                                    { value: 'unglazed', display: 'Unglazed' },
                                ]}
                                selected={
                                    state.modelInput.collector.estimate.collectorType
                                }
                                callback={(value) =>
                                    dispatchMerge({
                                        modelInput: {
                                            collector: {
                                                estimate: { collectorType: value },
                                            },
                                        },
                                    })
                                }
                            />
                        </MyTd>
                    </tr>
                    <tr>
                        <MyTd>Aperture area of solar collector</MyTd>
                        <MyTd>
                            <MyNumericInput
                                value={state.modelInput.collector.apertureArea}
                                callback={(value) =>
                                    dispatchMerge({
                                        modelInput: {
                                            collector: {
                                                apertureArea: value,
                                            },
                                        },
                                    })
                                }
                            />{' '}
                            m²{' '}
                            <MySelect
                                options={[
                                    { value: 'exact', display: 'exact' },
                                    { value: 'gross', display: 'gross' },
                                ]}
                                selected={
                                    state.modelInput.collector.estimate.apertureAreaType
                                }
                                callback={(value) =>
                                    dispatchMerge({
                                        modelInput: {
                                            collector: {
                                                estimate: { apertureAreaType: value },
                                            },
                                        },
                                    })
                                }
                            />
                        </MyTd>
                    </tr>
                </>
            );
        }
        return (
            <>
                <LockedWarning locked={scenarioLocked} />
                <h3>Solar Hot Water system</h3>

                <table className="table" style={{ width: 'initial' }}>
                    <tbody>
                        <tr>
                            <MyTd>Use a solar hot water system</MyTd>
                            <MyTd>
                                <CheckboxInput
                                    checked={moduleEnabled}
                                    callback={(checked) =>
                                        dispatchMerge({
                                            moduleEnabled: checked,
                                        })
                                    }
                                    readOnly={scenarioLocked}
                                />
                            </MyTd>
                        </tr>
                        <tr>
                            <MyTd>Solar water heating pump</MyTd>
                            <MyTd>
                                <MySelect
                                    options={[
                                        { value: 'PV', display: 'PV powered' },
                                        {
                                            value: 'electric',
                                            display: 'Electrically powered',
                                        },
                                    ]}
                                    selected={state.pumpType}
                                    callback={(value) =>
                                        dispatchMerge({
                                            pumpType: value,
                                        })
                                    }
                                />
                            </MyTd>
                        </tr>
                        <tr>
                            <MyTd>Parameter source</MyTd>
                            <MyTd>
                                <MySelect
                                    options={[
                                        {
                                            value: 'test certificate',
                                            display: 'Test Certificate',
                                        },
                                        { value: 'estimate', display: 'Estimated' },
                                    ]}
                                    selected={state.modelInput.collector.parameterSource}
                                    callback={(value) =>
                                        dispatchMerge({
                                            modelInput: {
                                                collector: { parameterSource: value },
                                            },
                                        })
                                    }
                                />
                            </MyTd>
                        </tr>

                        <TestCertificateParameters />
                        <EstimatedParameters />

                        <tr>
                            <MyTd>
                                a* = 0.892 (a<sub>1</sub> + 45 a<sub>2</sub>)
                            </MyTd>
                            <MyTd>
                                <MyNumericOutput value={modelOutput?.aStar} />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>
                                Collector performance ratio a*/η<sub>0</sub>
                            </MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={modelOutput?.collectorPerformanceRatio}
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>Collector orientation</MyTd>
                            <MyTd>
                                <MySelect
                                    options={Orientation.names.map((orientationName) => ({
                                        value: orientationName,
                                        display: orientationName,
                                    }))}
                                    selected={state.modelInput.collector.orientation}
                                    callback={(value) =>
                                        dispatchMerge({
                                            modelInput: {
                                                collector: { orientation: value },
                                            },
                                        })
                                    }
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>Collector inclination (e.g. 35 degrees)</MyTd>
                            <MyTd>
                                <MyNumericInput
                                    value={state.modelInput.collector.inclination}
                                    callback={(value) =>
                                        dispatchMerge({
                                            modelInput: {
                                                collector: { inclination: value },
                                            },
                                        })
                                    }
                                />{' '}
                                degrees
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>
                                Annual solar radiation per m²
                                <br />
                                from U3.3 in Appendix U for the orientation and tilt of
                                the collector
                            </MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={modelOutput?.annualSolarRadiation}
                                    unit={'kWh'}
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>Overshading factor</MyTd>
                            <MyTd>
                                <MySelect
                                    options={Overshading.all.map(({ name, display }) => ({
                                        value: name,
                                        display,
                                    }))}
                                    selected={state.modelInput.collector.overshading}
                                    callback={(value) =>
                                        dispatchMerge({
                                            modelInput: {
                                                collector: { overshading: value },
                                            },
                                        })
                                    }
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>Solar energy available</MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={modelOutput?.availableSolarEnergy}
                                    unit={'kWh'}
                                />
                            </MyTd>
                        </tr>
                    </tbody>
                </table>
                <h4>Utilisation</h4>

                <p>
                    The overall performance of solar water systems depends on how the hot
                    water system is used, e.g. daily draw-off patterns and the use of
                    other water heating devices such as a boiler or an immersion. The
                    procedure described here is not suitable for detailed design in a
                    particular case. It is intended to give a representative value of the
                    solar contribution to domestic water heating over a range of users
                </p>

                <table className="table" style={{ width: 'initial' }}>
                    <tbody>
                        <tr>
                            <MyTd>Load</MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={modelOutput?.utilisation.load}
                                    unit={'kWh'}
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>Solar-to-load ratio</MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={modelOutput?.utilisation.solarToLoadRatio}
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>Utilisation factor</MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={modelOutput?.utilisation.utilisationFactor}
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>Collector performance factor</MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={
                                        modelOutput?.utilisation
                                            .collectorPerformanceFactor
                                    }
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>
                                Dedicated solar storage volume, V<sub>s</sub>, (litres)
                            </MyTd>
                            <MyTd>
                                <MyNumericInput
                                    value={state.modelInput.dedicatedSolarStorageVolume}
                                    callback={(value) =>
                                        dispatchMerge({
                                            modelInput: {
                                                dedicatedSolarStorageVolume: value,
                                            },
                                        })
                                    }
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>
                                If combined cylinder, total volume of cylinder (litres)
                            </MyTd>
                            <MyTd>
                                <MyNumericInput
                                    value={state.modelInput.combinedCylinderVolume}
                                    callback={(value) =>
                                        dispatchMerge({
                                            modelInput: { combinedCylinderVolume: value },
                                        })
                                    }
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>
                                Effective solar volume, V<sub>eff</sub>
                            </MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={modelOutput?.utilisation.effectiveSolarVolume}
                                    unit={'litres'}
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>
                                Daily hot water demand, V<sub>d,average</sub> [from
                                heating page]
                            </MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={modelOutput?.utilisation.dailyHotWaterDemand}
                                    unit={'litres'}
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>
                                Volume ratio V<sub>eff</sub>/V<sub>d,average</sub>
                            </MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={modelOutput?.utilisation.volumeRatio}
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>
                                Solar storage volume factor f<sub>2</sub> = 1 + 0.2 ×
                                ln(Volume Ratio)
                            </MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={
                                        modelOutput?.utilisation.solarStorageVolumeFactor
                                    }
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>
                                Annual solar input Q<sub>s</sub>
                            </MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={modelOutput?.utilisation.annualSolarInput}
                                    unit={'kWh'}
                                />
                            </MyTd>
                        </tr>
                    </tbody>
                </table>
            </>
        );
    },
};
