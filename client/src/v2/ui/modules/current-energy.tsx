import { mapValues } from 'lodash';
import React, { ReactElement } from 'react';

import { Scenario } from '../../data-schemas/scenario';
import { coalesceEmptyString } from '../../data-schemas/scenario/value-schemas';
import { assertNever } from '../../helpers/assert-never';
import { filterValues } from '../../helpers/filter-values';
import { PropsOf } from '../../helpers/props-of';
import { Result } from '../../helpers/result';
import { DeepPartial, safeMerge } from '../../helpers/safe-merge';
import * as targets from '../../model/datasets/targets';
import { CheckboxInput } from '../input-components/checkbox';
import { FormGrid, InfoTooltip } from '../input-components/forms';
import { Fuel, SelectFuel } from '../input-components/libraries';
import { NumericInput } from '../input-components/numeric';
import type { UiModule } from '../module-management/module-type';
import { noOutput, NumericOutput } from '../output-components/numeric';
import { TargetBar } from '../output-components/target-bar';

type EnergySourceOutput = {
    co2factor: number | typeof noOutput;
    kgCo2: number | typeof noOutput;
    primaryEnergyFactor: number | typeof noOutput;
    primaryEnergykWh: number | typeof noOutput;
    unitCost: number | typeof noOutput;
    standingCharge: number | typeof noOutput;
    totalCost: number | typeof noOutput;
};

type OnsiteGenerationInput = {
    annualkWh: number | null;
    fractionUsedOnsite: number | null;
    fitAnnualIncome: number | null;
};

type ConsumptionData = {
    inputs: {
        kWh: number | null;
    };
    outputs: EnergySourceOutput;
};

export type State = {
    modal: 'select fuel' | null;
    totals: {
        currentEnergy: {
            dailyPersonalkWh: number | typeof noOutput;
            primaryEnergykWh: number | typeof noOutput;
            primaryEnergykWhm2: number | typeof noOutput;
            co2: number | typeof noOutput;
            co2m2: number | typeof noOutput;
            grossCost: number | typeof noOutput;
            netCost: number | typeof noOutput;
        };
        baseline: {
            dailyPersonalkWh: number | typeof noOutput;
            primaryEnergykWhm2: number | typeof noOutput;
            co2m2: number | typeof noOutput;
        };
    };
    consumption: Record<string, ConsumptionData>;
    generation:
        | {
              type: 'none';
              onsite: OnsiteGenerationInput;
          }
        | {
              type: 'onsite';
              onsite: OnsiteGenerationInput;
              outputs: EnergySourceOutput;
          };
    fuels: Record<string, Fuel>;
};
export type Action =
    | { type: 'external data update'; state: Partial<State> }
    | { type: 'current energy/add fuel use'; fuel: Fuel }
    | {
          type: 'current energy/update fuel use';
          fuelName: string;
          inputs: ConsumptionData['inputs'];
      }
    | { type: 'current energy/delete fuel use'; fuelName: string }
    | {
          type: 'current energy/update generation';
          value: DeepPartial<State['generation']>;
      }
    | { type: 'current energy/show modal'; modal: State['modal'] };

type Dispatcher = (action: Action) => void;

function EnergyTotals({
    totals,
}: {
    totals: State['totals']['currentEnergy'];
}): ReactElement {
    return (
        <div>
            <h4>Annual totals</h4>

            <table className="table">
                <tbody>
                    <tr>
                        <th style={{ fontWeight: 'normal' }}>
                            <span style={{ fontWeight: 'bold' }}>
                                Primary energy consumption
                            </span>
                            <InfoTooltip>
                                All energy use (including the fraction used onsite from
                                renewable generation) minus the total savings due to
                                generation
                            </InfoTooltip>
                        </th>
                        <td>
                            <NumericOutput
                                value={totals.primaryEnergykWh}
                                dp={0}
                                unit="kWh"
                            />
                        </td>
                    </tr>
                    <tr>
                        <th>Primary energy consumption per m² floor area</th>
                        <td>
                            <NumericOutput
                                value={totals.primaryEnergykWhm2}
                                dp={0}
                                unit="kWh/m²"
                            />
                        </td>
                    </tr>
                    <tr>
                        <th style={{ fontWeight: 'normal' }}>
                            <span style={{ fontWeight: 'bold' }}>CO₂ emissions</span>
                            <InfoTooltip>
                                All CO₂ emittted from all energy sources (including the
                                fraction used onsite from renewable generation) minus the
                                total savings due to generation
                            </InfoTooltip>
                        </th>
                        <td>
                            <NumericOutput value={totals.co2} dp={0} unit="kg" />
                        </td>
                    </tr>
                    <tr>
                        <th>CO₂ emissions per m² floor area</th>
                        <td>
                            <NumericOutput
                                value={totals.co2m2}
                                dp={0}
                                unit={<span>kgCO₂/m²</span>}
                            />
                        </td>
                    </tr>
                    <tr>
                        <th>Energy cost from bills</th>
                        <td>
                            £<NumericOutput value={totals.grossCost} dp={0} />
                        </td>
                    </tr>
                    <tr>
                        <th>Net energy cost, including FIT income</th>
                        <td>
                            £<NumericOutput value={totals.netCost} dp={0} />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function TargetBars({ totals }: { totals: State['totals'] }): ReactElement {
    return (
        <div>
            <h4>Comparison charts</h4>
            <p>
                Top/lighter = from data provided on this page
                <br />
                Bottom/darker = from the modelled baseline
            </p>

            <TargetBar
                name="Primary energy demand"
                width={424.5}
                value={[
                    totals.currentEnergy.primaryEnergykWhm2,
                    totals.baseline.primaryEnergykWhm2,
                ]}
                units="kWh/m²"
                targets={targets.primaryEnergyDemand}
            />

            <TargetBar
                name="CO₂ emission rate"
                width={424.5}
                value={[totals.currentEnergy.co2m2, totals.baseline.co2m2]}
                units="kgCO₂/m²"
                targets={targets.co2m2}
            />

            <TargetBar
                name="Per person energy use"
                width={424.5}
                value={[
                    totals.currentEnergy.dailyPersonalkWh,
                    totals.baseline.dailyPersonalkWh,
                ]}
                units="kWh/day"
                targets={targets.energyUsePerPerson}
            />
        </div>
    );
}

function AddFuelModal({
    consumption,
    fuels,
    dispatch,
}: {
    consumption: State['consumption'];
    fuels: State['fuels'];
    dispatch: Dispatcher;
}) {
    const fuelNamesInUse = Object.keys(consumption);
    const availableFuels = filterValues(
        fuels,
        (_, fuel) =>
            fuel.category !== 'Generation' && !fuelNamesInUse.includes(fuel.name),
    );

    return (
        <SelectFuel
            fuels={availableFuels}
            onSelect={(fuel) => {
                dispatch({
                    type: 'current energy/add fuel use',
                    fuel,
                });
            }}
            onClose={() => {
                dispatch({
                    type: 'current energy/show modal',
                    modal: null,
                });
            }}
        />
    );
}

function ConsumptionTable({
    consumption,
    dispatch,
}: {
    consumption: State['consumption'];
    dispatch: Dispatcher;
}): ReactElement {
    function MiddleAlignedCell(props: Omit<PropsOf<'td'>, 'style'>) {
        return <td {...props} style={{ verticalAlign: 'middle' }} />;
    }

    return (
        <table className="table mb-15">
            <thead style={{ backgroundColor: 'var(--brown-4)' }}>
                <tr>
                    <th style={{ width: 100 }}></th>
                    <th>Annual use</th>
                    <th>CO₂ factor</th>
                    <th>CO₂ emissions</th>
                    <th>Primary energy factor</th>
                    <th>Primary energy</th>
                    <th>Unit cost</th>
                    <th>Standing charge</th>
                    <th>Annual cost</th>
                    <th></th>
                </tr>
            </thead>

            <tbody>
                {Object.keys(consumption).length === 0 ? (
                    <tr>
                        <td colSpan={10}>No energy use added yet</td>
                    </tr>
                ) : (
                    Object.entries(consumption).map(([key, row]) => (
                        <tr key={key}>
                            <MiddleAlignedCell>
                                <label htmlFor={`consumption-row-${key}`}>{key}</label>
                            </MiddleAlignedCell>
                            <MiddleAlignedCell className="align-right text-tabular-nums text-nowrap">
                                <NumericInput
                                    id={`consumption-row-${key}`}
                                    value={row.inputs.kWh}
                                    callback={(value) =>
                                        dispatch({
                                            type: 'current energy/update fuel use',
                                            fuelName: key,
                                            inputs: {
                                                kWh: value,
                                            },
                                        })
                                    }
                                />{' '}
                                kWh
                            </MiddleAlignedCell>
                            <MiddleAlignedCell className="align-right text-tabular-nums">
                                × <NumericOutput value={row.outputs.co2factor} />
                            </MiddleAlignedCell>
                            <MiddleAlignedCell className="align-right text-tabular-nums">
                                <NumericOutput
                                    value={row.outputs.kgCo2}
                                    unit="kg"
                                    dp={0}
                                />
                            </MiddleAlignedCell>
                            <MiddleAlignedCell className="align-right text-tabular-nums">
                                ×{' '}
                                <NumericOutput value={row.outputs.primaryEnergyFactor} />
                            </MiddleAlignedCell>
                            <MiddleAlignedCell className="align-right text-tabular-nums text-nowrap">
                                <NumericOutput
                                    value={row.outputs.primaryEnergykWh}
                                    unit="kWh"
                                    dp={0}
                                />
                            </MiddleAlignedCell>
                            <MiddleAlignedCell className="align-right text-tabular-nums text-nowrap">
                                <NumericOutput
                                    value={row.outputs.unitCost}
                                    unit="p/kWh"
                                />
                            </MiddleAlignedCell>
                            <MiddleAlignedCell className="align-right text-tabular-nums">
                                £
                                <NumericOutput
                                    value={row.outputs.standingCharge}
                                    dp={2}
                                />
                            </MiddleAlignedCell>
                            <MiddleAlignedCell className="align-right text-tabular-nums">
                                £<NumericOutput value={row.outputs.totalCost} />
                            </MiddleAlignedCell>
                            <MiddleAlignedCell>
                                <button
                                    className="btn"
                                    onClick={() => {
                                        dispatch({
                                            type: 'current energy/delete fuel use',
                                            fuelName: key,
                                        });
                                    }}
                                >
                                    <i className="icon-trash" />
                                </button>
                            </MiddleAlignedCell>
                        </tr>
                    ))
                )}
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan={10}>
                        <button
                            className="btn"
                            onClick={() => {
                                dispatch({
                                    type: 'current energy/show modal',
                                    modal: 'select fuel',
                                });
                            }}
                        >
                            + Add fuel
                        </button>
                    </td>
                </tr>
            </tfoot>
        </table>
    );
}

function ConversionFactors() {
    return (
        <details className="mb-30">
            <summary>Show conversion factors</summary>

            <table className="table mb-15" style={{ width: 'auto' }}>
                <thead style={{ backgroundColor: 'var(--brown-4)' }}>
                    <tr>
                        <th>Name</th>
                        <th>Unit</th>
                        <th>Equivalent energy</th>
                        <th style={{ width: '40ch' }}>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Wood logs</td>
                        <td>1m³</td>
                        <td className="text-right tabular-nums">1380 kWh</td>
                        <td>Assumes stacked measure, with gaps</td>
                    </tr>
                    <tr>
                        <td>Wood pellets</td>
                        <td>1m³</td>
                        <td className="text-right tabular-nums">4230 kWh</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td rowSpan={2}>Mains gas</td>
                        <td>1m³</td>
                        <td className="text-right tabular-nums">11.18 kWh</td>
                        <td rowSpan={2}>
                            Calorific value of mains gas varies over time and by region.
                            You can check against current figures, or use this as an
                            approximation.
                        </td>
                    </tr>
                    <tr>
                        <td>1ft³</td>
                        <td className="text-right tabular-nums">31.70 kWh</td>
                    </tr>
                    <tr>
                        <td>Oil</td>
                        <td>1 litre</td>
                        <td className="text-right tabular-nums">10.35 kWh</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td rowSpan={2}>Bottled gas (LPG)</td>
                        <td>1 litre</td>
                        <td className="text-right tabular-nums">7.11 kWh</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>1kg</td>
                        <td className="text-right tabular-nums">13.89 kWh</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Coal</td>
                        <td>1kg</td>
                        <td className="text-right tabular-nums">8.34 kWh</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Smokeless fuel</td>
                        <td>1kg</td>
                        <td className="text-right tabular-nums">8.90 kWh</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Anthracite</td>
                        <td>1kg</td>
                        <td className="text-right tabular-nums">9.66 kWh</td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        </details>
    );
}

function GenerationTable({
    generationOutputs,
}: {
    generationOutputs: EnergySourceOutput;
}): ReactElement {
    function MiddleAlignedCell(props: Omit<PropsOf<'td'>, 'style'>) {
        return <td {...props} style={{ verticalAlign: 'middle' }} />;
    }

    return (
        <table className="table mb-15">
            <thead style={{ backgroundColor: 'var(--brown-4)' }}>
                <tr>
                    <th>CO₂ factor</th>
                    <th>CO₂ emissions saved</th>
                    <th>Primary energy factor</th>
                    <th>Primary energy saved</th>
                    <th>Unit cost</th>
                    <th>Annual saving</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <MiddleAlignedCell className="align-right text-tabular-nums">
                        × <NumericOutput value={generationOutputs.co2factor} />
                    </MiddleAlignedCell>
                    <MiddleAlignedCell className="align-right text-tabular-nums">
                        <NumericOutput value={generationOutputs.kgCo2} unit="kg" dp={0} />
                    </MiddleAlignedCell>
                    <MiddleAlignedCell className="align-right text-tabular-nums">
                        × <NumericOutput value={generationOutputs.primaryEnergyFactor} />
                    </MiddleAlignedCell>
                    <MiddleAlignedCell className="align-right text-tabular-nums text-nowrap">
                        <NumericOutput
                            value={generationOutputs.primaryEnergykWh}
                            unit="kWh"
                            dp={0}
                        />
                    </MiddleAlignedCell>
                    <MiddleAlignedCell className="align-right text-tabular-nums text-nowrap">
                        <NumericOutput value={generationOutputs.unitCost} unit="p/kWh" />
                    </MiddleAlignedCell>
                    <MiddleAlignedCell className="align-right text-tabular-nums">
                        £<NumericOutput value={generationOutputs.totalCost} />
                    </MiddleAlignedCell>
                </tr>
            </tbody>
        </table>
    );
}

function Generation({
    generation,
    dispatch,
}: {
    generation: State['generation'];
    dispatch: Dispatcher;
}): ReactElement {
    return (
        <>
            <FormGrid>
                <label htmlFor="onsite-generation">Is there on site generation?</label>
                <span>
                    <CheckboxInput
                        id="onsite-generation"
                        checked={generation.type === 'onsite'}
                        callback={(checked) =>
                            dispatch({
                                type: 'current energy/update generation',
                                value: {
                                    type: checked === true ? 'onsite' : 'none',
                                },
                            })
                        }
                    />
                </span>

                {generation.type === 'onsite' && (
                    <>
                        <label htmlFor="generation-annual-kwh">Annual generation</label>
                        <NumericInput
                            id="generation-annual-kwh"
                            value={generation.onsite.annualkWh}
                            unit="kWh"
                            callback={(value) =>
                                dispatch({
                                    type: 'current energy/update generation',
                                    value: {
                                        onsite: { annualkWh: value },
                                    },
                                })
                            }
                        />

                        <label htmlFor="generation-fraction-onsite">
                            Fraction used onsite
                        </label>
                        <NumericInput
                            id="generation-fraction-onsite"
                            style={{ width: '5ch' }}
                            value={generation.onsite.fractionUsedOnsite}
                            callback={(value) =>
                                dispatch({
                                    type: 'current energy/update generation',
                                    value: {
                                        onsite: { fractionUsedOnsite: value },
                                    },
                                })
                            }
                        />

                        <label htmlFor="generation-fit-income">FIT annual income</label>
                        <span>
                            £{' '}
                            <NumericInput
                                id="generation-fit-income"
                                value={generation.onsite.fitAnnualIncome}
                                callback={(value) =>
                                    dispatch({
                                        type: 'current energy/update generation',
                                        value: {
                                            onsite: { fitAnnualIncome: value },
                                        },
                                    })
                                }
                            />
                        </span>
                    </>
                )}
            </FormGrid>

            {generation.type === 'onsite' && (
                <GenerationTable generationOutputs={generation.outputs} />
            )}
        </>
    );
}

function extractGeneration(scenario: Scenario): State['generation'] {
    const { currentenergy, fuels } = scenario ?? {};
    const onsite = {
        annualkWh:
            coalesceEmptyString(currentenergy?.generation?.annual_generation, null) ??
            null,
        fractionUsedOnsite:
            coalesceEmptyString(currentenergy?.generation?.fraction_used_onsite, null) ??
            null,
        fitAnnualIncome:
            coalesceEmptyString(currentenergy?.generation?.annual_FIT_income, null) ??
            null,
    };

    if (currentenergy?.onsite_generation !== 1) {
        return {
            type: 'none',
            onsite,
        };
    } else {
        return {
            type: 'onsite',
            onsite,
            outputs: {
                co2factor:
                    coalesceEmptyString(fuels?.['generation']?.co2factor, null) ??
                    noOutput,
                kgCo2: currentenergy?.generation?.annual_CO2 ?? noOutput,
                primaryEnergyFactor:
                    coalesceEmptyString(
                        fuels?.['generation']?.primaryenergyfactor,
                        null,
                    ) ?? noOutput,
                primaryEnergykWh: currentenergy?.generation?.primaryenergy ?? noOutput,
                unitCost:
                    coalesceEmptyString(fuels?.['generation']?.fuelcost, null) ??
                    noOutput,
                standingCharge:
                    coalesceEmptyString(fuels?.['generation']?.standingcharge, null) ??
                    noOutput,
                totalCost: currentenergy?.generation?.annual_savings ?? noOutput,
            },
        };
    }
}

function extractOutputsFromLegacy(scenario: Scenario): Partial<State> {
    const { kwhdpp, kgco2perm2, primary_energy_use_m2, currentenergy, fuels } =
        scenario ?? {};
    return {
        totals: {
            baseline: {
                dailyPersonalkWh: kwhdpp ?? noOutput,
                co2m2: kgco2perm2 ?? noOutput,
                primaryEnergykWhm2: primary_energy_use_m2 ?? noOutput,
            },
            currentEnergy: {
                dailyPersonalkWh: currentenergy?.energyuseperperson ?? noOutput,
                primaryEnergykWh: currentenergy?.primaryenergy_annual_kwh ?? noOutput,
                primaryEnergykWhm2: currentenergy?.primaryenergy_annual_kwhm2 ?? noOutput,
                co2: currentenergy?.total_co2 ?? noOutput,
                co2m2: currentenergy?.total_co2m2 ?? noOutput,
                grossCost: currentenergy?.total_cost ?? noOutput,
                netCost: currentenergy?.annual_net_cost ?? noOutput,
            },
        },
        consumption: mapValues(
            currentenergy?.use_by_fuel ?? {},
            (fuel, name): ConsumptionData => ({
                inputs: {
                    kWh: coalesceEmptyString(fuel.annual_use, null),
                },
                outputs: {
                    co2factor:
                        coalesceEmptyString(fuels?.[name]?.co2factor, null) ?? noOutput,
                    kgCo2: fuel.annual_co2 ?? noOutput,
                    primaryEnergyFactor:
                        coalesceEmptyString(fuels?.[name]?.primaryenergyfactor, null) ??
                        noOutput,
                    primaryEnergykWh: fuel.primaryenergy ?? noOutput,
                    unitCost:
                        coalesceEmptyString(fuels?.[name]?.fuelcost, null) ?? noOutput,
                    standingCharge:
                        coalesceEmptyString(fuels?.[name]?.standingcharge, null) ??
                        noOutput,
                    totalCost: fuel.annualcost ?? noOutput,
                },
            }),
        ),
        generation: extractGeneration(scenario),
        fuels: mapValues(fuels, ({ category }, name) => ({
            tag: name,
            name,
            category,
        })),
    };
}

export const currentEnergyModule: UiModule<State, Action, never> = {
    name: 'current energy',
    initialState: () => ({
        modal: null,
        totals: {
            baseline: {
                dailyPersonalkWh: noOutput,
                co2m2: noOutput,
                primaryEnergykWhm2: noOutput,
            },
            currentEnergy: {
                dailyPersonalkWh: noOutput,
                primaryEnergykWh: noOutput,
                primaryEnergykWhm2: noOutput,
                co2: noOutput,
                co2m2: noOutput,
                grossCost: noOutput,
                netCost: noOutput,
            },
        },
        consumption: {},
        generation: {
            type: 'none',
            onsite: { annualkWh: null, fractionUsedOnsite: null, fitAnnualIncome: null },
        },
        fuels: {},
    }),
    reducer: (state, action) => {
        switch (action.type) {
            case 'external data update': {
                return [
                    {
                        ...state,
                        ...action.state,
                    },
                ];
            }

            case 'current energy/add fuel use': {
                state.consumption[action.fuel.name] = {
                    inputs: { kWh: null },
                    outputs: {
                        co2factor: noOutput,
                        kgCo2: noOutput,
                        primaryEnergyFactor: noOutput,
                        primaryEnergykWh: noOutput,
                        unitCost: noOutput,
                        standingCharge: noOutput,
                        totalCost: noOutput,
                    },
                };
                state.modal = null;
                return [state];
            }

            case 'current energy/update fuel use': {
                const energySource = state.consumption[action.fuelName];
                if (energySource !== undefined) {
                    energySource.inputs = safeMerge(energySource.inputs, action.inputs);
                }
                return [state];
            }

            case 'current energy/delete fuel use': {
                delete state.consumption[action.fuelName];
                return [state];
            }

            case 'current energy/update generation': {
                state.generation = safeMerge(state.generation, action.value);
                return [state];
            }

            case 'current energy/show modal': {
                state.modal = action.modal;
                return [state];
            }
        }
    },
    effector: assertNever,
    component: function CurrentEnergy({ state, dispatch }) {
        return (
            <>
                <section className="line-top mb-45">
                    <div className="mb-15">
                        <h3 className="ma-0 mb-15">Totals &amp; comparisons</h3>

                        <p>
                            The figures shown below on the left are the totals for actual
                            energy use. If the input data is accurate, these figures
                            represent real values.
                        </p>
                        <p>
                            The graphs compare these values against the ones given by the
                            model for the baseline scenario. According to the
                            characteristics of the building, target temperature, type of
                            fuel, etc. the model calculates the theoretical amount of
                            energy needed to run the dwelling.
                        </p>
                        <p>
                            Comparing current energy use against the modelled use can give
                            an idea of how well the model represents reality.
                        </p>
                    </div>

                    <div className="d-flex justify-content-between mb-30">
                        <EnergyTotals totals={state.totals.currentEnergy} />
                        <TargetBars totals={state.totals} />
                    </div>
                </section>
                <section className="line-top mb-45">
                    <h3 className="ma-0 mb-15">Consumption</h3>

                    {state.modal === 'select fuel' && (
                        <AddFuelModal
                            dispatch={dispatch}
                            fuels={state.fuels}
                            consumption={state.consumption}
                        />
                    )}
                    <ConsumptionTable
                        consumption={state.consumption}
                        dispatch={dispatch}
                    />
                    <ConversionFactors />
                </section>
                <section className="line-top mb-45">
                    <h3 className="ma-0 mb-15">Generation</h3>

                    <Generation generation={state.generation} dispatch={dispatch} />
                </section>
            </>
        );
    },
    shims: {
        extractUpdateAction: ({ currentScenario }) => {
            return Result.ok({
                type: 'external data update',
                state: extractOutputsFromLegacy(currentScenario),
            });
        },
        mutateLegacyData: ({ project, scenarioId }, state) => {
            /* eslint-disable
               @typescript-eslint/consistent-type-assertions,
               @typescript-eslint/no-explicit-any,
               @typescript-eslint/no-unsafe-assignment,
               @typescript-eslint/no-unsafe-member-access,
            */
            const dataAny = (project as any).data[scenarioId as any];
            dataAny.currentenergy = dataAny.currentenergy ?? {};
            dataAny.currentenergy.onsite_generation =
                state.generation.type !== 'none' ? 1 : false;
            dataAny.currentenergy.generation = {
                annual_generation: state.generation.onsite.annualkWh,
                annual_FIT_income: state.generation.onsite.fitAnnualIncome,
                fraction_used_onsite: state.generation.onsite.fractionUsedOnsite,
            };
            dataAny.currentenergy.use_by_fuel = mapValues(
                state.consumption,
                (energySource) => ({
                    annual_use:
                        energySource.inputs.kWh === null ? '' : energySource.inputs.kWh,
                }),
            );
            /* eslint-enable */
        },
    },
};
