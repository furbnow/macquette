import React from 'react';

import { assertNever } from '../../helpers/assert-never';
import { Result } from '../../helpers/result';
import { totalCostOfMeasures } from '../../measures';
import { CombinedModules } from '../../model/combined-modules';
import * as targets from '../../model/datasets/targets';
import type { UiModule } from '../module-management/module-type';
import { House } from '../output-components/house';
import { LockedWarning } from '../output-components/locked-warning';
import { NumberOutput } from '../output-components/numeric';
import { TargetBar } from '../output-components/target-bar';
import type { ScenarioPageName, StandalonePageName } from '../pages';
import { pageTitles } from '../pages';

export type State = {
    currentPage: StandalonePageName | ScenarioPageName | null;
    isScenarioPage: boolean;
    houseGraphicShown: boolean;
    scenarioId: string;
    scenarioLocked: boolean;
    measuresCost: number | null;
    targetBarData: {
        spaceHeatingDemand: number | null;
        dailyPersonalkWh: number | null;
        co2m2: number | null;
        primaryEnergykWhm2: number | null;
    };
    houseData: {
        floor: number | null;
        ventilation: number | null;
        infiltration: number | null;
        windows: number | null;
        walls: number | null;
        roof: number | null;
        thermalbridge: number | null;
    };
};
export type Action = { type: 'update state'; state: Partial<State> };

export const editorHeaderModule: UiModule<State, Action, never> = {
    name: 'editorHeader',
    component: function EditorHeader({ state, dispatch }) {
        let scenarioName = null;
        if (state.isScenarioPage) {
            if (state.scenarioId === 'master') {
                scenarioName = 'Baseline';
            } else {
                scenarioName =
                    state.scenarioId.charAt(0).toUpperCase() +
                    state.scenarioId.slice(1, -1) +
                    ' ' +
                    state.scenarioId.slice(-1);
            }
        }

        return (
            <>
                <div className="d-flex justify-content-between align-items-center mb-30">
                    <h2 className="ma-0">
                        {scenarioName !== null && (
                            <>
                                {scenarioName}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                    className="mx-7"
                                    viewBox="0 0 16 16"
                                >
                                    <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z" />
                                </svg>
                            </>
                        )}
                        {state.currentPage === null
                            ? ''
                            : pageTitles[state.currentPage] ?? ''}
                    </h2>

                    {state.isScenarioPage && (
                        <button
                            onClick={() =>
                                dispatch({
                                    type: 'update state',
                                    state: {
                                        houseGraphicShown: !state.houseGraphicShown,
                                    },
                                })
                            }
                            className="btn"
                        >
                            {state.houseGraphicShown ? 'Hide' : 'Show'} graphics
                        </button>
                    )}
                </div>

                <LockedWarning locked={state.scenarioLocked} />

                {state.houseGraphicShown && state.isScenarioPage && (
                    <div className="d-flex align-items-center justify-content-between pb-30">
                        <div style={{ width: '50%' }}>
                            <House {...state.houseData} />
                            {state.measuresCost !== null && (
                                <div>
                                    Measures cost: £
                                    <NumberOutput value={state.measuresCost} dp={0} />
                                </div>
                            )}
                        </div>

                        <div>
                            <TargetBar
                                name="Space heating demand"
                                width={425}
                                value={[state.targetBarData.spaceHeatingDemand]}
                                units="kWh/m²"
                                targets={targets.spaceHeatingDemand}
                            />

                            <TargetBar
                                name="Primary energy demand"
                                width={425}
                                value={[state.targetBarData.primaryEnergykWhm2]}
                                units="kWh/m²"
                                targets={targets.primaryEnergyDemand}
                            />

                            <TargetBar
                                name="CO₂ emission rate"
                                width={425}
                                value={[state.targetBarData.co2m2]}
                                units="kgCO₂/m²"
                                targets={targets.co2m2}
                            />

                            <TargetBar
                                name="Per person energy use"
                                width={425}
                                value={[state.targetBarData.dailyPersonalkWh]}
                                units="kWh/day"
                                targets={targets.energyUsePerPerson}
                            />
                        </div>
                    </div>
                )}
            </>
        );
    },
    initialState: () => {
        return {
            currentPage: null,
            isScenarioPage: false,
            scenarioId: '',
            scenarioLocked: false,
            measuresCost: null,
            targetBarData: {
                dailyPersonalkWh: null,
                co2m2: null,
                primaryEnergykWhm2: null,
                spaceHeatingDemand: null,
            },
            houseData: {
                floor: 0,
                ventilation: 0,
                infiltration: 0,
                windows: 0,
                walls: 0,
                roof: 0,
                thermalbridge: 0,
            },
            houseGraphicShown: true,
        };
    },
    reducer: (state, action) => {
        switch (action.type) {
            case 'update state':
                return [{ ...state, ...action.state }];
        }
    },
    effector: assertNever,
    shims: {
        extractUpdateAction: function ({
            currentScenario,
            scenarioId,
            route,
            currentModel,
        }) {
            function unwrap(fn: (model: CombinedModules) => number): number | null {
                return currentModel
                    .map(fn)
                    .mapErr(() => null)
                    .coalesce();
            }

            return Result.ok<Action[]>([
                {
                    type: 'update state',
                    state: {
                        currentPage: route.page,
                        isScenarioPage: route.type === 'with scenario',
                        scenarioId: scenarioId ?? '',
                        scenarioLocked:
                            route.type === 'with scenario' &&
                            (currentScenario?.locked ?? false),
                        measuresCost:
                            scenarioId !== 'master'
                                ? totalCostOfMeasures(currentScenario)
                                : null,
                        targetBarData: {
                            spaceHeatingDemand:
                                currentScenario?.space_heating_demand_m2 ?? null,
                            dailyPersonalkWh: currentScenario?.kwhdpp ?? null,
                            co2m2: currentScenario?.kgco2perm2 ?? null,
                            primaryEnergykWhm2:
                                currentScenario?.primary_energy_use_m2 ?? null,
                        },
                        houseData: {
                            floor: unwrap((m) => m.fabric.heatLossTotals.floor),
                            windows: unwrap((m) => m.fabric.heatLossTotals.windowLike),
                            walls: unwrap((m) => m.fabric.heatLossTotals.externalWall),
                            roof: unwrap((m) => m.fabric.heatLossTotals.roof),
                            ventilation: unwrap((m) => m.ventilation.heatLossAverage),
                            infiltration: unwrap((m) => m.infiltration.heatLossAverage),
                            thermalbridge: unwrap(
                                (m) => m.fabric.thermalBridgingHeatLoss,
                            ),
                        },
                    },
                },
            ]);
        },
        mutateLegacyData: () => undefined,
    },
};
