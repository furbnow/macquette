import React from 'react';
import { z } from 'zod';

import { resultSchema } from '../../data-schemas/helpers/result';
import { Scenario } from '../../data-schemas/scenario';
import { totalCostOfMeasures } from '../../measures';
import { CombinedModules } from '../../model/combined-modules';
import * as targets from '../../model/datasets/targets';
import { House } from './house';
import { NumberOutput } from './numeric';
import { TargetBar } from './target-bar';

export type GraphicsInput = {
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

export function getGraphicsInput(scenarioId: string, scenario: Scenario): GraphicsInput {
    let model: CombinedModules | null = null;

    if (scenario?.model !== undefined) {
        const modelR = resultSchema(z.instanceof(CombinedModules), z.unknown()).safeParse(
            scenario.model,
        );
        if (modelR.success === true) {
            model = modelR.data.mapErr(() => null).coalesce();
        }
    }

    return {
        measuresCost: scenarioId !== 'master' ? totalCostOfMeasures(scenario) : null,
        targetBarData: {
            spaceHeatingDemand: scenario?.space_heating_demand_m2 ?? null,
            dailyPersonalkWh: scenario?.kwhdpp ?? null,
            co2m2: scenario?.kgco2perm2 ?? null,
            primaryEnergykWhm2: scenario?.primary_energy_use_m2 ?? null,
        },
        houseData: {
            floor: model?.fabric.heatLossTotals.floor ?? null,
            windows: model?.fabric.heatLossTotals.windowLike ?? null,
            walls: model?.fabric.heatLossTotals.externalWall ?? null,
            roof: model?.fabric.heatLossTotals.roof ?? null,
            ventilation: model?.ventilation.heatLossAverage ?? null,
            infiltration: model?.infiltration.heatLossAverage ?? null,
            thermalbridge: model?.fabric.thermalBridgingHeatLoss ?? null,
        },
    };
}

export function Graphics({ input }: { input: GraphicsInput }) {
    return (
        <div className="d-flex align-items-center justify-content-between pb-30">
            <div style={{ width: '50%' }}>
                <House {...input.houseData} />
                {input.measuresCost !== null && (
                    <div>
                        Measures cost: £
                        <NumberOutput value={input.measuresCost} dp={0} />
                    </div>
                )}
            </div>

            <div>
                <TargetBar
                    name="Space heating demand"
                    width={425}
                    value={[input.targetBarData.spaceHeatingDemand]}
                    units="kWh/m²"
                    targets={targets.spaceHeatingDemand}
                />

                <TargetBar
                    name="Primary energy demand"
                    width={425}
                    value={[input.targetBarData.primaryEnergykWhm2]}
                    units="kWh/m²"
                    targets={targets.primaryEnergyDemand}
                />

                <TargetBar
                    name="CO₂ emission rate"
                    width={425}
                    value={[input.targetBarData.co2m2]}
                    units="kgCO₂/m²"
                    targets={targets.co2m2}
                />

                <TargetBar
                    name="Per person energy use"
                    width={425}
                    value={[input.targetBarData.dailyPersonalkWh]}
                    units="kWh/day"
                    targets={targets.energyUsePerPerson}
                />
            </div>
        </div>
    );
}
