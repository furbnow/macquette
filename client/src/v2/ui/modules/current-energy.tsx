import { mapValues } from 'lodash';
import React, { ReactElement } from 'react';
import { z } from 'zod';
import { projectSchema } from '../../data-schemas/project';

import { Scenario } from '../../data-schemas/scenario';
import { coalesceEmptyString } from '../../data-schemas/scenario/value-schemas';
import { assertNever } from '../../helpers/assert-never';
import { filterValues } from '../../helpers/filter-values';
import { PropsOf } from '../../helpers/props-of';
import { Result } from '../../helpers/result';
import { DeepPartial, safeMerge } from '../../helpers/safe-merge';
import { CombinedModules } from '../../model/combined-modules';
import * as targets from '../../model/datasets/targets';
import { CheckboxInput } from '../input-components/checkbox';
import { FormGrid, InfoTooltip } from '../input-components/forms';
import { Fuel, SelectFuel } from '../input-components/libraries';
import { NumberInput } from '../input-components/number';
import type { UiModule } from '../module-management/module-type';
import { NumberOutput } from '../output-components/numeric';
import { TargetBar } from '../output-components/target-bar';

type OnsiteGenerationInput = {
    annualEnergy: number | null;
    fractionUsedOnsite: number | null;
    fitAnnualIncome: number | null;
};

export type State = {
    modal: 'select fuel' | null;
    modelOutput: CombinedModules | null;
    totals: {
        baseline: {
            annualEnergyEndUse: number | null;
            dailyEnergyUsePerPerson: number | null;
            annualPrimaryEnergyPerArea: number | null;
            annualCarbonEmissionsPerArea: number | null;
        };
    };
    annualEnergyConsumptionByFuel: Record<string, number | null>;
    generation:
        | {
              type: 'none';
              onSite: OnsiteGenerationInput;
          }
        | {
              type: 'onsite';
              onSite: OnsiteGenerationInput;
          };
    fuels: Record<string, Fuel>;
};
export type Action =
    | {
          type: 'external data update';
          state: Partial<State>;
          modelOutput: CombinedModules | null;
      }
    | { type: 'current energy/add fuel use'; fuel: Fuel }
    | {
          type: 'current energy/update fuel use';
          fuelName: string;
          annualEnergy: number | null;
      }
    | { type: 'current energy/delete fuel use'; fuelName: string }
    | {
          type: 'current energy/update generation';
          value: DeepPartial<State['generation']>;
      }
    | { type: 'current energy/show modal'; modal: State['modal'] };

type Dispatcher = (action: Action) => void;

function MiddleAlignedCell(props: PropsOf<'td'>) {
    return <td {...props} style={{ ...props.style, verticalAlign: 'middle' }} />;
}

function EnergyTotals({
    modelOutput,
}: {
    modelOutput: CombinedModules | null;
}): ReactElement {
    if (modelOutput === null) {
        return <></>;
    }
    const { currentEnergy, floors } = modelOutput;
    return (
        <div>
            <h4>Annual totals</h4>

            <table className="table">
                <tbody>
                    <tr>
                        <th style={{ fontWeight: 'normal' }}>
                            <span style={{ fontWeight: 'bold' }}>Energy end use</span>
                            <InfoTooltip>
                                The total energy used in the household, including the
                                on-site portion of generated energy.
                            </InfoTooltip>
                        </th>
                        <td>
                            <NumberOutput
                                value={currentEnergy.annualEnergyEndUse}
                                dp={0}
                                unit="kWh"
                            />
                        </td>
                    </tr>
                    <tr>
                        <th style={{ fontWeight: 'normal' }}>
                            <span style={{ fontWeight: 'bold' }}>
                                Primary energy consumption
                            </span>
                            <InfoTooltip>
                                All primary energy from all energy sources, not including
                                generation.
                            </InfoTooltip>
                        </th>
                        <td>
                            <NumberOutput
                                value={currentEnergy.annualPrimaryEnergy}
                                dp={0}
                                unit="kWh"
                            />
                        </td>
                    </tr>
                    <tr>
                        <th>Primary energy consumption per m² floor area</th>
                        <td>
                            <NumberOutput
                                value={
                                    currentEnergy.annualPrimaryEnergy /
                                    floors.totalFloorArea
                                }
                                dp={0}
                                unit="kWh/m²"
                            />
                        </td>
                    </tr>
                    <tr>
                        <th style={{ fontWeight: 'normal' }}>
                            <span style={{ fontWeight: 'bold' }}>CO₂ emissions</span>
                            <InfoTooltip>
                                All CO₂ emitted from all energy sources, not including
                                generation (since generation is assumed to be
                                zero-carbon).
                            </InfoTooltip>
                        </th>
                        <td>
                            <NumberOutput
                                value={currentEnergy.annualCarbonEmissions}
                                dp={0}
                                unit="kg"
                            />
                        </td>
                    </tr>
                    <tr>
                        <th>CO₂ emissions per m² floor area</th>
                        <td>
                            <NumberOutput
                                value={
                                    currentEnergy.annualCarbonEmissions /
                                    floors.totalFloorArea
                                }
                                dp={0}
                                unit={<span>kgCO₂/m²</span>}
                            />
                        </td>
                    </tr>
                    <tr>
                        <th>Energy cost from bills</th>
                        <td>
                            £
                            <NumberOutput value={currentEnergy.annualGrossCost} dp={0} />
                        </td>
                    </tr>
                    <tr>
                        <th>Net energy cost, including FIT income</th>
                        <td>
                            £
                            <NumberOutput value={currentEnergy.annualNetCost} dp={0} />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function TargetBars({
    modelOutput,
    totals,
}: {
    modelOutput: CombinedModules | null;
    totals: State['totals'];
}): ReactElement {
    if (modelOutput === null) {
        return <></>;
    }
    const { currentEnergy, floors, occupancy } = modelOutput;
    return (
        <div>
            <h4>Comparison charts</h4>
            <p>
                Top/lighter = from data provided on this page
                <br />
                Bottom/darker = from the modelled baseline
            </p>

            <TargetBar
                name="End-use energy intensity"
                width={424.5}
                value={[
                    currentEnergy.annualEnergyEndUse / floors.totalFloorArea,
                    totals.baseline.annualEnergyEndUse === null
                        ? null
                        : totals.baseline.annualEnergyEndUse / floors.totalFloorArea,
                ]}
                units="kWh/m²"
            />

            <TargetBar
                name="Primary energy intensity"
                width={424.5}
                value={[
                    currentEnergy.annualPrimaryEnergy / floors.totalFloorArea,
                    totals.baseline.annualPrimaryEnergyPerArea,
                ]}
                units="kWh/m²"
                targets={targets.primaryEnergyDemand}
            />

            <TargetBar
                name="CO₂ emission rate"
                width={424.5}
                value={[
                    currentEnergy.annualCarbonEmissions / floors.totalFloorArea,
                    totals.baseline.annualCarbonEmissionsPerArea,
                ]}
                units="kgCO₂/m²"
                targets={targets.co2m2}
            />

            <TargetBar
                name="Daily per-person energy use"
                width={424.5}
                value={[
                    currentEnergy.annualEnergyEndUse / 365.0 / occupancy.occupancy,
                    totals.baseline.dailyEnergyUsePerPerson,
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
    consumption: State['annualEnergyConsumptionByFuel'];
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
    annualEnergyConsumptionByFuel,
    modelOutput,
    dispatch,
}: {
    annualEnergyConsumptionByFuel: State['annualEnergyConsumptionByFuel'];
    modelOutput: CombinedModules | null;
    dispatch: Dispatcher;
}): ReactElement {
    if (modelOutput === null) {
        return <></>;
    }
    const { currentEnergy } = modelOutput;

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
                {Object.keys(annualEnergyConsumptionByFuel).length === 0 ? (
                    <tr>
                        <td colSpan={10}>No energy use added yet</td>
                    </tr>
                ) : (
                    Object.entries(annualEnergyConsumptionByFuel).map(
                        ([fuelName, annualEnergy]) => {
                            const modelOutputFuel =
                                currentEnergy?.fuels[fuelName] ?? null;
                            return (
                                <tr key={fuelName}>
                                    <MiddleAlignedCell>
                                        <label htmlFor={`consumption-row-${fuelName}`}>
                                            {fuelName}
                                        </label>
                                    </MiddleAlignedCell>
                                    <MiddleAlignedCell className="align-right text-tabular-nums text-nowrap">
                                        <NumberInput
                                            id={`consumption-row-${fuelName}`}
                                            value={annualEnergy}
                                            onChange={(value) =>
                                                dispatch({
                                                    type: 'current energy/update fuel use',
                                                    fuelName: fuelName,
                                                    annualEnergy: value,
                                                })
                                            }
                                        />{' '}
                                        kWh
                                    </MiddleAlignedCell>
                                    <MiddleAlignedCell className="align-right text-tabular-nums">
                                        ×{' '}
                                        <NumberOutput
                                            value={
                                                modelOutputFuel?.fuel
                                                    .carbonEmissionsFactor
                                            }
                                        />
                                    </MiddleAlignedCell>
                                    <MiddleAlignedCell className="align-right text-tabular-nums">
                                        <NumberOutput
                                            value={modelOutputFuel?.annualCarbonEmissions}
                                            unit="kg"
                                            dp={0}
                                        />
                                    </MiddleAlignedCell>
                                    <MiddleAlignedCell className="align-right text-tabular-nums">
                                        ×{' '}
                                        <NumberOutput
                                            value={
                                                modelOutputFuel?.fuel.primaryEnergyFactor
                                            }
                                        />
                                    </MiddleAlignedCell>
                                    <MiddleAlignedCell className="align-right text-tabular-nums text-nowrap">
                                        <NumberOutput
                                            value={modelOutputFuel?.annualPrimaryEnergy}
                                            unit="kWh"
                                            dp={0}
                                        />
                                    </MiddleAlignedCell>
                                    <MiddleAlignedCell className="align-right text-tabular-nums text-nowrap">
                                        <NumberOutput
                                            value={modelOutputFuel?.fuel.unitPrice}
                                            unit="p/kWh"
                                        />
                                    </MiddleAlignedCell>
                                    <MiddleAlignedCell className="align-right text-tabular-nums">
                                        £
                                        <NumberOutput
                                            value={modelOutputFuel?.fuel.standingCharge}
                                            dp={2}
                                        />
                                    </MiddleAlignedCell>
                                    <MiddleAlignedCell className="align-right text-tabular-nums">
                                        £
                                        <NumberOutput
                                            value={modelOutputFuel?.annualCost}
                                        />
                                    </MiddleAlignedCell>
                                    <MiddleAlignedCell>
                                        <button
                                            className="btn"
                                            onClick={() => {
                                                dispatch({
                                                    type: 'current energy/delete fuel use',
                                                    fuelName: fuelName,
                                                });
                                            }}
                                        >
                                            <i className="icon-trash" />
                                        </button>
                                    </MiddleAlignedCell>
                                </tr>
                            );
                        },
                    )
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
    modelOutput,
}: {
    modelOutput: CombinedModules;
}): ReactElement {
    const { currentEnergy } = modelOutput;

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
                        ×{' '}
                        <NumberOutput
                            value={currentEnergy?.generation?.fuel.carbonEmissionsFactor}
                        />
                    </MiddleAlignedCell>
                    <MiddleAlignedCell className="align-right text-tabular-nums">
                        <NumberOutput
                            value={currentEnergy?.generation?.annualCarbonEmissionsSaved}
                            unit="kg"
                            dp={0}
                        />
                    </MiddleAlignedCell>
                    <MiddleAlignedCell className="align-right text-tabular-nums">
                        ×{' '}
                        <NumberOutput
                            value={currentEnergy?.generation?.fuel.primaryEnergyFactor}
                        />
                    </MiddleAlignedCell>
                    <MiddleAlignedCell className="align-right text-tabular-nums text-nowrap">
                        <NumberOutput
                            value={currentEnergy?.generation?.annualPrimaryEnergySaved}
                            unit="kWh"
                            dp={0}
                        />
                    </MiddleAlignedCell>
                    <MiddleAlignedCell className="align-right text-tabular-nums text-nowrap">
                        <NumberOutput
                            value={currentEnergy?.generation?.fuel.unitPrice}
                            unit="p/kWh"
                        />
                    </MiddleAlignedCell>
                    <MiddleAlignedCell className="align-right text-tabular-nums">
                        £
                        <NumberOutput
                            value={currentEnergy?.generation?.annualCostSaved}
                        />
                    </MiddleAlignedCell>
                </tr>
            </tbody>
        </table>
    );
}

function Generation({
    generation,
    modelOutput,
    dispatch,
}: {
    generation: State['generation'];
    modelOutput: CombinedModules | null;
    dispatch: Dispatcher;
}): ReactElement {
    if (modelOutput === null) {
        return <></>;
    }
    return (
        <>
            <FormGrid>
                <label htmlFor="onsite-generation">Is there on site generation?</label>
                <span>
                    <CheckboxInput
                        id="onsite-generation"
                        value={generation.type === 'onsite'}
                        onChange={(checked) =>
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
                        <NumberInput
                            id="generation-annual-kwh"
                            value={generation.onSite.annualEnergy}
                            unit="kWh"
                            onChange={(value) =>
                                dispatch({
                                    type: 'current energy/update generation',
                                    value: {
                                        onSite: { annualEnergy: value },
                                    },
                                })
                            }
                        />

                        <label htmlFor="generation-fraction-onsite">
                            Fraction used onsite
                        </label>
                        <NumberInput
                            id="generation-fraction-onsite"
                            style={{ width: '5ch' }}
                            value={generation.onSite.fractionUsedOnsite}
                            onChange={(value) =>
                                dispatch({
                                    type: 'current energy/update generation',
                                    value: {
                                        onSite: { fractionUsedOnsite: value },
                                    },
                                })
                            }
                        />

                        <label htmlFor="generation-fit-income">FIT annual income</label>
                        <span>
                            £{' '}
                            <NumberInput
                                id="generation-fit-income"
                                value={generation.onSite.fitAnnualIncome}
                                onChange={(value) =>
                                    dispatch({
                                        type: 'current energy/update generation',
                                        value: {
                                            onSite: { fitAnnualIncome: value },
                                        },
                                    })
                                }
                            />
                        </span>
                    </>
                )}
            </FormGrid>

            {generation.type === 'onsite' && (
                <GenerationTable modelOutput={modelOutput} />
            )}
        </>
    );
}

function extractStateFromLegacy(scenario: Scenario): Partial<State> {
    const {
        kwhdpp,
        kgco2perm2,
        primary_energy_use_m2,
        currentenergy,
        fuels,
        energy_use,
    } = scenario ?? {};
    return {
        totals: {
            baseline: {
                annualEnergyEndUse: energy_use ?? null,
                dailyEnergyUsePerPerson: kwhdpp ?? null,
                annualCarbonEmissionsPerArea: kgco2perm2 ?? null,
                annualPrimaryEnergyPerArea: primary_energy_use_m2 ?? null,
            },
        },
        annualEnergyConsumptionByFuel: mapValues(
            currentenergy?.use_by_fuel ?? {},
            (fuel) => coalesceEmptyString(fuel.annual_use, null),
        ),
        fuels: mapValues(fuels, ({ category }, name) => ({
            tag: name,
            name,
            category,
        })),
        generation: {
            type: currentenergy?.onsite_generation === 1 ? 'onsite' : 'none',
            onSite: {
                annualEnergy:
                    coalesceEmptyString(
                        currentenergy?.generation?.annual_generation,
                        null,
                    ) ?? null,
                fractionUsedOnsite:
                    coalesceEmptyString(
                        currentenergy?.generation?.fraction_used_onsite,
                        null,
                    ) ?? null,
                fitAnnualIncome:
                    coalesceEmptyString(
                        currentenergy?.generation?.annual_FIT_income,
                        null,
                    ) ?? null,
            },
        },
    };
}

export const currentEnergyModule: UiModule<State, Action, never> = {
    name: 'current energy',
    initialState: () => ({
        modal: null,
        modelOutput: null,
        totals: {
            baseline: {
                annualEnergyEndUse: null,
                dailyEnergyUsePerPerson: null,
                annualCarbonEmissionsPerArea: null,
                annualPrimaryEnergyPerArea: null,
            },
            currentEnergy: {
                dailyPersonalkWh: null,
                primaryEnergykWh: null,
                primaryEnergykWhm2: null,
                co2: null,
                co2m2: null,
                grossCost: null,
                netCost: null,
            },
        },
        annualEnergyConsumptionByFuel: {},
        generation: {
            type: 'none',
            onSite: {
                annualEnergy: null,
                fractionUsedOnsite: null,
                fitAnnualIncome: null,
            },
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
                        modelOutput: action.modelOutput,
                    },
                ];
            }

            case 'current energy/add fuel use': {
                state.annualEnergyConsumptionByFuel[action.fuel.name] = null;
                state.modal = null;
                return [state];
            }

            case 'current energy/update fuel use': {
                state.annualEnergyConsumptionByFuel[action.fuelName] =
                    action.annualEnergy;
                return [state];
            }

            case 'current energy/delete fuel use': {
                delete state.annualEnergyConsumptionByFuel[action.fuelName];
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
                        <EnergyTotals modelOutput={state.modelOutput} />
                        <TargetBars
                            totals={state.totals}
                            modelOutput={state.modelOutput}
                        />
                    </div>
                </section>
                <section className="line-top mb-45">
                    <h3 className="ma-0 mb-15">Consumption</h3>

                    {state.modal === 'select fuel' && (
                        <AddFuelModal
                            dispatch={dispatch}
                            fuels={state.fuels}
                            consumption={state.annualEnergyConsumptionByFuel}
                        />
                    )}
                    <ConsumptionTable
                        annualEnergyConsumptionByFuel={
                            state.annualEnergyConsumptionByFuel
                        }
                        modelOutput={state.modelOutput}
                        dispatch={dispatch}
                    />
                    <ConversionFactors />
                </section>
                <section className="line-top mb-45">
                    <h3 className="ma-0 mb-15">Generation</h3>

                    <Generation
                        generation={state.generation}
                        modelOutput={state.modelOutput}
                        dispatch={dispatch}
                    />
                </section>
            </>
        );
    },
    shims: {
        extractUpdateAction: ({ currentScenario, currentModel }) => {
            return Result.ok({
                type: 'external data update',
                state: extractStateFromLegacy(currentScenario),
                modelOutput: currentModel.mapErr(() => null).coalesce(),
            });
        },
        mutateLegacyData: ({ project, scenarioId }, state) => {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            const data = (project as z.input<typeof projectSchema>).data[
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                scenarioId as string
            ];
            if (data === undefined) {
                console.error('Could not mutate legacy data as data was undefined');
                return;
            }
            data.currentenergy = data.currentenergy ?? {};
            data.currentenergy.onsite_generation =
                state.generation.type !== 'none' ? 1 : false;
            data.currentenergy.generation = {
                annual_generation: state.generation.onSite.annualEnergy ?? undefined,
                annual_FIT_income: state.generation.onSite.fitAnnualIncome ?? undefined,
                fraction_used_onsite:
                    state.generation.onSite.fractionUsedOnsite ?? undefined,
            };
            data.currentenergy.use_by_fuel = mapValues(
                state.annualEnergyConsumptionByFuel,
                (annualEnergy) => ({
                    annual_use: annualEnergy === null ? '' : annualEnergy,
                }),
            );
        },
    },
};
