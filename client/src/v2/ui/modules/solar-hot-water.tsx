import { cloneDeep } from 'lodash';
import React from 'react';

import { Scenario } from '../../data-schemas/scenario';
import { SolarHotWaterV1 } from '../../data-schemas/scenario/solar-hot-water';
import { nanToNull, orNullish } from '../../helpers/null-wrapping';
import { PropsOf } from '../../helpers/props-of';
import { DeepPartial, safeMerge, DeepWith } from '../../helpers/safe-merge';
import { Shadow } from '../../helpers/shadow-object-type';
import { Orientation } from '../../model/enums/orientation';
import { Overshading } from '../../model/enums/overshading';
import { CheckboxInput } from '../input-components/checkbox';
import { NumericInput, NumericInputProps } from '../input-components/numeric';
import { Select, SelectProps } from '../input-components/select';
import type { UiModule } from '../module-management';
import { LockedWarning } from '../output-components/locked-warning';
import {
    loading,
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

type RefactoredScenarioInputs = SolarHotWaterV1['input'];
type Inputs = {
    moduleEnabled: boolean;
    pumpType: 'PV' | 'electric' | null;
} & RefactoredScenarioInputs;

export type SolarHotWaterState = {
    outputs: null | DeepWith<typeof noOutput, ModelOutputs>;
    inputs: Inputs;
};

type MergeInputAction = {
    type: 'solar hot water/merge input';
    input: DeepPartial<Inputs>;
};
export type SolarHotWaterAction = MergeInputAction;

const extractOutputsFromLegacy = ({
    SHW,
    water_heating,
}: Scenario): SolarHotWaterState['outputs'] => {
    return {
        aStar: nanToNull(SHW?.a) ?? noOutput,
        collectorPerformanceRatio:
            nanToNull(SHW?.collector_performance_ratio) ?? noOutput,
        annualSolarRadiation: nanToNull(SHW?.annual_solar) ?? noOutput,
        availableSolarEnergy: nanToNull(SHW?.solar_energy_available) ?? noOutput,
        utilisation: {
            load: nanToNull(water_heating?.annual_energy_content) ?? noOutput,
            solarToLoadRatio: nanToNull(SHW?.solar_load_ratio) ?? noOutput,
            utilisationFactor: nanToNull(SHW?.utilisation_factor) ?? noOutput,
            collectorPerformanceFactor:
                nanToNull(SHW?.collector_performance_factor) ?? noOutput,
            effectiveSolarVolume: nanToNull(SHW?.Veff) ?? noOutput,
            dailyHotWaterDemand: nanToNull(water_heating?.Vd_average) ?? noOutput,
            volumeRatio: nanToNull(SHW?.volume_ratio) ?? noOutput,
            solarStorageVolumeFactor: nanToNull(SHW?.f2) ?? noOutput,
            annualSolarInput: nanToNull(SHW?.Qs) ?? noOutput,
        },
    };
};

const extractInputsFromLegacy = ({
    SHW,
    use_SHW,
}: Scenario): SolarHotWaterState['inputs'] => {
    const refactoredScenarioInputs: RefactoredScenarioInputs =
        SHW?.input ?? solarHotWaterModule.initialState.inputs;
    const moduleEnabled =
        orNullish((v: 1 | boolean) => v === 1 || v === true)(use_SHW) ?? false;
    const pumpType = SHW?.pump ?? null;
    return {
        ...cloneDeep(refactoredScenarioInputs),
        moduleEnabled,
        pumpType,
    };
};

export const solarHotWaterModule: UiModule<SolarHotWaterState> = {
    initialState: {
        outputs: null,
        inputs: {
            moduleEnabled: false,
            pumpType: null,
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
        },
    },
    reducer: (state, action) => {
        switch (action.type) {
            case 'external data update': {
                state.outputs = extractOutputsFromLegacy(action.data);
                state.inputs = extractInputsFromLegacy(action.data);
                return state;
            }
            case 'solar hot water/merge input': {
                const { inputs } = state;
                if (inputs !== null) {
                    state.inputs = safeMerge(inputs, action.input);
                }
                return state;
            }
            default: {
                return state;
            }
        }
    },
    dataMutator: (data, state) => {
        const { inputs } = state.moduleState;
        const { moduleEnabled, pumpType, ...copiableInputs } = inputs;

        const newSHW: SolarHotWaterV1 = {
            version: 1,
            input: copiableInputs,
            pump: pumpType ?? undefined,
        };
        /* eslint-disable
           @typescript-eslint/consistent-type-assertions,
           @typescript-eslint/no-explicit-any,
           @typescript-eslint/no-unsafe-assignment,
           @typescript-eslint/no-unsafe-member-access,
        */
        const dataAny = data as any;
        dataAny.SHW = newSHW;
        dataAny.use_SHW = moduleEnabled;
        dataAny.water_heating = dataAny.water_heating ?? {};
        dataAny.water_heating.solar_water_heating = moduleEnabled;
        /* eslint-enable */
    },
    rootComponent: ({ state, dispatch }) => {
        const { commonState, moduleState } = state;
        const { inputs, outputs } = moduleState;
        const dispatchInput = (input: MergeInputAction['input']) =>
            dispatch({
                type: 'solar hot water/merge input',
                input,
            });
        const moduleEnabled = inputs.moduleEnabled ?? false;
        const MySelect = <T extends string>(
            props: Omit<SelectProps<T>, 'disabled' | 'style'>,
        ) => (
            <Select
                {...props}
                disabled={!moduleEnabled || commonState.locked}
                style={{ width: 'max-content', marginBottom: 0 }}
            />
        );
        const MyNumericInput = (props: Omit<NumericInputProps, 'readOnly' | 'style'>) => (
            <NumericInput
                {...props}
                readOnly={!moduleEnabled || commonState.locked}
                style={{ width: '50px', marginBottom: 0 }}
            />
        );
        const MyNumericOutput = (
            props: Shadow<
                NumericOutputProps,
                {
                    value: number | typeof noOutput | undefined;
                }
            >,
        ) => <NumericOutput {...props} value={props.value ?? loading} />;
        const MyTd = (props: Omit<PropsOf<'td'>, 'style'>) => (
            <td {...props} style={{ verticalAlign: 'middle' }} />
        );
        const TestCertificateParameters = () => {
            if (
                inputs.collector === undefined ||
                inputs.collector.parameterSource !== 'test certificate'
            ) {
                return <></>;
            }
            return (
                <>
                    <tr>
                        <MyTd>Aperture area of solar collector</MyTd>
                        <MyTd>
                            <MyNumericInput
                                value={inputs.collector.apertureArea}
                                callback={(value) =>
                                    dispatchInput({
                                        collector: {
                                            apertureArea: value,
                                        },
                                    })
                                }
                            />{' '}
                            m<sup>2</sup>
                        </MyTd>
                    </tr>
                    <tr>
                        <MyTd>
                            Zero-loss collector efficiency, η<sub>0</sub>
                        </MyTd>
                        <MyTd>
                            <MyNumericInput
                                value={
                                    inputs.collector.testCertificate.zeroLossEfficiency
                                }
                                callback={(value) =>
                                    dispatchInput({
                                        collector: {
                                            testCertificate: {
                                                zeroLossEfficiency: value,
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
                                    inputs.collector.testCertificate
                                        .linearHeatLossCoefficient
                                }
                                callback={(value) =>
                                    dispatchInput({
                                        collector: {
                                            testCertificate: {
                                                linearHeatLossCoefficient: value,
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
                                    inputs.collector.testCertificate
                                        .secondOrderHeatLossCoefficient
                                }
                                callback={(value) =>
                                    dispatchInput({
                                        collector: {
                                            testCertificate: {
                                                secondOrderHeatLossCoefficient: value,
                                            },
                                        },
                                    })
                                }
                            />
                        </MyTd>
                    </tr>
                </>
            );
        };
        const EstimatedParameters = () => {
            if (inputs.collector.parameterSource !== 'estimate') {
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
                                selected={inputs.collector.estimate.collectorType}
                                callback={(value) =>
                                    dispatchInput({
                                        collector: { estimate: { collectorType: value } },
                                    })
                                }
                            />
                        </MyTd>
                    </tr>
                    <tr>
                        <MyTd>Aperture area of solar collector</MyTd>
                        <MyTd>
                            <MyNumericInput
                                value={inputs.collector.apertureArea}
                                callback={(value) =>
                                    dispatchInput({
                                        collector: {
                                            apertureArea: value,
                                        },
                                    })
                                }
                            />{' '}
                            m<sup>2</sup>{' '}
                            <MySelect
                                options={[
                                    { value: 'exact', display: 'exact' },
                                    { value: 'gross', display: 'gross' },
                                ]}
                                selected={inputs.collector.estimate.apertureAreaType}
                                callback={(value) =>
                                    dispatchInput({
                                        collector: {
                                            estimate: { apertureAreaType: value },
                                        },
                                    })
                                }
                            />
                        </MyTd>
                    </tr>
                </>
            );
        };
        return (
            <>
                <LockedWarning locked={commonState.locked} />
                <h3>Solar Hot Water system</h3>

                <table className="table" style={{ width: 'initial' }}>
                    <tbody>
                        <tr>
                            <MyTd>Use a solar hot water system</MyTd>
                            <MyTd>
                                <CheckboxInput
                                    checked={moduleEnabled}
                                    callback={(checked) =>
                                        dispatchInput({
                                            moduleEnabled: checked,
                                        })
                                    }
                                    readOnly={commonState.locked}
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
                                    selected={inputs.pumpType}
                                    callback={(value) =>
                                        dispatchInput({
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
                                    selected={inputs.collector.parameterSource}
                                    callback={(value) =>
                                        dispatchInput({
                                            collector: { parameterSource: value },
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
                                <MyNumericOutput value={outputs?.aStar} />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>
                                Collector performance ratio a*/η<sub>0</sub>
                            </MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={outputs?.collectorPerformanceRatio}
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
                                    selected={inputs.collector.orientation}
                                    callback={(value) =>
                                        dispatchInput({
                                            collector: { orientation: value },
                                        })
                                    }
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>Collector inclination (e.g. 35 degrees)</MyTd>
                            <MyTd>
                                <MyNumericInput
                                    value={inputs.collector.inclination}
                                    callback={(value) =>
                                        dispatchInput({
                                            collector: { inclination: value },
                                        })
                                    }
                                />{' '}
                                degrees
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>
                                Annual solar radiation per m<sup>2</sup>
                                <br />
                                from U3.3 in Appendix U for the orientation and tilt of
                                the collector
                            </MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={outputs?.annualSolarRadiation}
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
                                    selected={inputs.collector.overshading}
                                    callback={(value) =>
                                        dispatchInput({
                                            collector: { overshading: value },
                                        })
                                    }
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>Solar energy available</MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={outputs?.availableSolarEnergy}
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
                                    value={outputs?.utilisation.load}
                                    unit={'kWh'}
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>Solar-to-load ratio</MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={outputs?.utilisation.solarToLoadRatio}
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>Utilisation factor</MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={outputs?.utilisation.utilisationFactor}
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>Collector performance factor</MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={
                                        outputs?.utilisation.collectorPerformanceFactor
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
                                    value={inputs.dedicatedSolarStorageVolume}
                                    callback={(value) =>
                                        dispatchInput({
                                            dedicatedSolarStorageVolume: value,
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
                                    value={inputs.combinedCylinderVolume}
                                    callback={(value) =>
                                        dispatchInput({
                                            combinedCylinderVolume: value,
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
                                    value={outputs?.utilisation.effectiveSolarVolume}
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
                                    value={outputs?.utilisation.dailyHotWaterDemand}
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
                                    value={outputs?.utilisation.volumeRatio}
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
                                    value={outputs?.utilisation.solarStorageVolumeFactor}
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>
                                Annual solar input Q<sub>s</sub>
                            </MyTd>
                            <MyTd>
                                <MyNumericOutput
                                    value={outputs?.utilisation.annualSolarInput}
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
