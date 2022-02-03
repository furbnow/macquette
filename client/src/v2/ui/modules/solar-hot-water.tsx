import React from 'react';
import { merge, set, unset } from 'lodash';
import { LegacyScenario } from '../../legacy-state-validators/scenario';
import { Orientation, OrientationName } from '../../model/enums/orientation';
import { Overshading, OvershadingName } from '../../model/enums/overshading';
import { NumericInput, NumericInputProps } from '../input-components/numeric';
import { CheckboxInput } from '../input-components/checkbox';
import { Select, SelectProps } from '../input-components/select';
import type { UiModule } from '../module-management';
import {
    solarHotWaterOvershadingFactor,
    solarHotWaterOvershadingFactorReverse,
} from '../../model/datasets';
import { nanToNull, orNullish, throwForNull } from '../../helpers/null-wrapping';
import {
    loading,
    noOutput,
    NumericOutput,
    NumericOutputProps,
} from '../output-components/numeric';
import { LockedWarning } from '../output-components/locked-warning';
import { PropsOf } from '../../helpers/props-of';
import { Shadow } from '../../helpers/shadow-object-type';

type DeepWith<U, T> = T extends object
    ? {
          [K in keyof T]: DeepWith<U, T[K]>;
      }
    : T | U;

type DeepPartial<T> = T extends object
    ? {
          [K in keyof T]?: DeepPartial<T[K]>;
      }
    : T;

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

type ModelInputs = {
    moduleEnabled: boolean;
    pumpType: 'PV' | 'electric';
    solarCollectorApertureArea: number;
    zeroLossCollectorEfficiency: number;
    collectorLinearHeatLossCoefficient: number;
    collectorSecondOrderHeatLossCoefficient: number;
    collectorOrientation: OrientationName;
    collectorInclination: number;
    overshading: OvershadingName;
    dedicatedSolarStorageVolume: number;
    combinedCylinderVolume: number;
};

export type SolarHotWaterState = {
    outputs: null | DeepWith<typeof noOutput, ModelOutputs>;
    inputs: DeepWith<null, ModelInputs>;
};

type MergeInputAction = {
    type: 'solar hot water/merge input';
    input: DeepPartial<SolarHotWaterState['inputs']>;
};
export type SolarHotWaterAction = MergeInputAction;

const extractOutputsFromLegacy = ({
    SHW,
    water_heating,
}: LegacyScenario): SolarHotWaterState['outputs'] => {
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

const orientationFromIndex0 = orNullish(Orientation.fromIndex0.bind(Orientation));
const orientationNew = orNullish((o: OrientationName) => new Orientation(o));
const overshadingFromFactor = orNullish(
    throwForNull(
        solarHotWaterOvershadingFactorReverse,
        (factor) => new Error(`Bad overshading factor for lookup: ${factor}`),
    ),
);

const extractInputsFromLegacy = ({
    SHW,
    use_SHW,
}: LegacyScenario): SolarHotWaterState['inputs'] => {
    return {
        moduleEnabled:
            orNullish((v: 1 | boolean) => v === 1 || v === true)(use_SHW) ?? null,
        pumpType: SHW?.pump ?? null,
        solarCollectorApertureArea: SHW?.A ?? null,
        zeroLossCollectorEfficiency: SHW?.n0 ?? null,
        collectorLinearHeatLossCoefficient: SHW?.a1 ?? null,
        collectorSecondOrderHeatLossCoefficient: SHW?.a2 ?? null,
        collectorOrientation: orientationFromIndex0(SHW?.orientation)?.name ?? null,
        collectorInclination: SHW?.inclination ?? null,
        overshading: overshadingFromFactor(SHW?.overshading)?.name ?? null,
        dedicatedSolarStorageVolume: SHW?.Vs ?? null,
        combinedCylinderVolume: SHW?.combined_cylinder_volume ?? null,
    };
};

/** Lodash merge with type checking that ensures Source extends Destination */
const safeMerge = <Source extends Dest, Dest extends object>(
    dest: Dest,
    source: Partial<Source>,
): Dest & Partial<Source> => {
    return merge(dest, source);
};

export const solarHotWaterModule: UiModule<SolarHotWaterState> = {
    initialState: {
        outputs: null,
        inputs: {
            moduleEnabled: null,
            pumpType: null,
            solarCollectorApertureArea: null,
            zeroLossCollectorEfficiency: null,
            collectorLinearHeatLossCoefficient: null,
            collectorSecondOrderHeatLossCoefficient: null,
            collectorOrientation: null,
            collectorInclination: null,
            overshading: null,
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
        const setData = (
            path: string[],
            stateInputValue: undefined | null | string | number | boolean,
        ) => {
            /* eslint-disable
               @typescript-eslint/consistent-type-assertions,
               @typescript-eslint/no-explicit-any,
               @typescript-eslint/no-unsafe-assignment,
               @typescript-eslint/no-unsafe-member-access,
            */
            const dataAny: any = data;
            if (stateInputValue !== undefined) {
                if (stateInputValue === null) {
                    unset(dataAny, path);
                } else {
                    set(dataAny, path, stateInputValue);
                }
            }
            /* eslint-enable */
        };
        setData(
            ['use_SHW'],
            orNullish((e: boolean) => (e ? 1 : false))(inputs.moduleEnabled),
        );
        setData(['SHW', 'pump'], inputs.pumpType);
        setData(['SHW', 'A'], inputs.solarCollectorApertureArea);
        setData(['SHW', 'n0'], inputs.zeroLossCollectorEfficiency);
        setData(['SHW', 'a1'], inputs.collectorLinearHeatLossCoefficient);
        setData(['SHW', 'a2'], inputs.collectorSecondOrderHeatLossCoefficient);
        setData(
            ['SHW', 'orientation'],
            orientationNew(inputs.collectorOrientation)?.index0 ?? null,
        );
        setData(['SHW', 'inclination'], inputs.collectorInclination);
        setData(
            ['SHW', 'overshading'],
            orNullish(solarHotWaterOvershadingFactor)(inputs.overshading),
        );
        setData(['SHW', 'Vs'], inputs.dedicatedSolarStorageVolume);
        setData(['SHW', 'combined_cylinder_volume'], inputs.combinedCylinderVolume);
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
                            <MyTd>Aperture area of solar collector</MyTd>
                            <MyTd>
                                <MyNumericInput
                                    value={inputs.solarCollectorApertureArea}
                                    callback={(value) =>
                                        dispatchInput({
                                            solarCollectorApertureArea: value,
                                        })
                                    }
                                />{' '}
                                m<sup>2</sup>
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>
                                Zero-loss collector efficiency, η<sub>0</sub>
                                <br />
                                from test certificate or Table H1
                            </MyTd>
                            <MyTd>
                                <MyNumericInput
                                    value={inputs.zeroLossCollectorEfficiency}
                                    callback={(value) =>
                                        dispatchInput({
                                            zeroLossCollectorEfficiency: value,
                                        })
                                    }
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>
                                Collector linear heat loss coefficient, a<sub>1</sub>
                                <br />
                                from test certificate
                            </MyTd>
                            <MyTd>
                                <MyNumericInput
                                    value={inputs.collectorLinearHeatLossCoefficient}
                                    callback={(value) =>
                                        dispatchInput({
                                            collectorLinearHeatLossCoefficient: value,
                                        })
                                    }
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>
                                Collector 2nd order heat loss coefficient, a<sub>2</sub>
                                <br />
                                from test certificate
                            </MyTd>
                            <MyTd>
                                <MyNumericInput
                                    value={inputs.collectorSecondOrderHeatLossCoefficient}
                                    callback={(value) =>
                                        dispatchInput({
                                            collectorSecondOrderHeatLossCoefficient:
                                                value,
                                        })
                                    }
                                />
                            </MyTd>
                        </tr>

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
                                    selected={inputs.collectorOrientation}
                                    callback={(value) =>
                                        dispatchInput({
                                            collectorOrientation: value,
                                        })
                                    }
                                />
                            </MyTd>
                        </tr>

                        <tr>
                            <MyTd>Collector inclination (e.g. 35 degrees)</MyTd>
                            <MyTd>
                                <MyNumericInput
                                    value={inputs.collectorInclination}
                                    callback={(value) =>
                                        dispatchInput({
                                            collectorInclination: value,
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
                                    selected={inputs.overshading}
                                    callback={(value) =>
                                        dispatchInput({ overshading: value })
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
