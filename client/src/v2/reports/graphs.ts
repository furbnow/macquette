import { coalesceEmptyString } from '../legacy-state-validators/numericValues';
import {
    legacyScenarioSchema,
    LegacyScenario,
} from '../legacy-state-validators/scenario';

/** Legacy project data wrapped with a safe accessor function */
class ProjectData {
    scenarios: Record<string, LegacyScenario> = {};

    constructor(data: unknown) {
        if (typeof data !== 'object' || data === null) {
            throw new Error('Project data is not an object');
        }
        for (const [id, scenario] of Object.entries(data)) {
            this.scenarios[id] = legacyScenarioSchema.parse(scenario);
        }
    }

    scenario(id: string): LegacyScenario {
        if (!(id in this.scenarios)) {
            throw new Error(`No scenario with ID ${id}`);
        }
        const scenario = this.scenarios[id];
        if (scenario === undefined) {
            throw new Error('Scenario is undefined');
        }
        return scenario;
    }
}

type Line = {
    value: number;
    label: string;
};

type ShadedArea = {
    interval: [number, number];
    label?: string;
};

type BarChart = {
    type: 'bar';
    stacked?: boolean;
    units: string;
    bins: { label: string; data: number[] }[];
    categoryLabels?: string[];
    lines?: Line[];
    areas?: ShadedArea[];
};

type LineGraph = {
    type: 'line';
    xAxis: { units: string };
    yAxis: { units: string };
    rows: {
        label: string;
        data: number[][];
    }[];
};

const scenarioName = (scenarioId: string, idx: number) =>
    scenarioId === 'master' ? 'Baseline' : `Scenario ${idx}`;

const heatBalance = (project: ProjectData, scenarioIds: string[]): BarChart => ({
    type: 'bar',
    stacked: true,
    units: 'kWh per m² per year',
    bins: scenarioIds.map((id, idx) => ({
        label: scenarioName(id, idx),
        data: [
            project.scenario(id).annual_useful_gains_kWh_m2?.Solar ?? 0,
            project.scenario(id).annual_useful_gains_kWh_m2?.Internal ?? 0,
            project.scenario(id).space_heating?.annual_heating_demand_m2 ?? 0,
            -(project.scenario(id).annual_losses_kWh_m2?.fabric ?? 0),
            -(
                (project.scenario(id).annual_losses_kWh_m2?.ventilation ?? 0) +
                (project.scenario(id).annual_losses_kWh_m2?.infiltration ?? 0)
            ),
        ],
    })),
    categoryLabels: [
        'Solar gains',
        'Internal gains',
        'Space heating requirement',
        'Fabric losses',
        'Ventilation and infiltration losses',
    ],
});

const spaceHeatingDemand = (project: ProjectData, scenarioIds: string[]): BarChart => ({
    type: 'bar',
    units: 'kWh per m² per year',
    bins: scenarioIds.map((id, idx) => ({
        label: scenarioName(id, idx),
        data: [
            project.scenario(id).FEE ?? 0,
            project.scenario(id).space_heating_demand_m2 ?? 0,
        ],
    })),
    categoryLabels: [
        'With standardised heating pattern',
        'With your current heating pattern',
    ],
    lines: [{ value: 120, label: 'UK average' }],
    areas: [{ label: 'Target', interval: [20, 70] }],
});

function getHeatingLoad(scenario: LegacyScenario) {
    const heatloss = scenario.totalWK ?? 0;
    const temp = scenario.temperature?.target ?? 0;
    const temp_diff = temp - -5;
    const peak_heat = heatloss * temp_diff;

    return {
        heatloss,
        temp,
        temp_diff,
        peak_heat: peak_heat / 1000, // in kW instead of W
    };
}

const peakHeatingLoad = (project: ProjectData, scenarioIds: string[]): BarChart => ({
    type: 'bar',
    units: 'kW',
    bins: scenarioIds.map((id, idx) => ({
        label: scenarioName(id, idx),
        data: [getHeatingLoad(project.scenario(id)).peak_heat],
    })),
    areas: [
        { interval: [3, 6], label: 'Small' },
        { interval: [6, 10], label: 'Medium' },
        { interval: [10, 15], label: 'Large' },
        { interval: [15, 21], label: 'Very large' },
    ],
});

const fuelUse = (project: ProjectData, scenarioIds: string[]): BarChart => {
    const fuelList = project.scenario('master').fuels;

    const getScenarioData = (
        fuelTotals: Exclude<LegacyScenario['fuel_totals'], undefined>,
    ): number[] => {
        const result = [0, 0, 0, 0];

        for (const { name, quantity } of Object.values(fuelTotals)) {
            const fuelType = fuelList?.[name];
            if (!fuelType) {
                throw new Error('Fuel does not have an associated category');
            }

            switch (fuelType.category.toLowerCase()) {
                case 'electricity':
                    result[0] += coalesceEmptyString(quantity, 0) ?? 0;
                    break;
                case 'gas':
                    result[1] += coalesceEmptyString(quantity, 0) ?? 0;
                    break;
                case 'oil':
                    result[2] += coalesceEmptyString(quantity, 0) ?? 0;
                    break;
                case 'solid fuel':
                    result[3] += coalesceEmptyString(quantity, 0) ?? 0;
                    break;
            }
        }

        return result;
    };

    const currentFuelUse = project.scenario('master').currentenergy?.use_by_fuel ?? {};
    const transformed = Object.fromEntries(
        Object.entries(currentFuelUse).map(([key, value]) => [
            key,
            { name: key, quantity: coalesceEmptyString(value.annual_use, 0) },
        ]),
    );
    const billsData = getScenarioData(transformed);

    // Add consumption from generation
    billsData[0] +=
        (project.scenario('master').currentenergy?.generation?.fraction_used_onsite ??
            0) *
        (project.scenario('master').currentenergy?.generation?.annual_generation ?? 0);

    const hasBillsData = billsData[0] || billsData[1] || billsData[2] || billsData[3];

    return {
        type: 'bar',
        stacked: true,
        units: 'kWh per year',
        bins: [
            hasBillsData
                ? {
                      label: 'Bills data',
                      data: billsData,
                  }
                : null,
            ...scenarioIds.map((scenarioId, idx) => ({
                label: scenarioName(scenarioId, idx),
                data: getScenarioData(project.scenario(scenarioId).fuel_totals ?? {}),
            })),
        ].filter((row): row is BarChart['bins'][0] => row !== null),
        categoryLabels: ['Electricity', 'Gas', 'Oil', 'Solid fuels'],
    };
};

const energyUseIntensity = (project: ProjectData, scenarioIds: string[]): BarChart => {
    const baseline = project.scenario('master');
    if (baseline.currentenergy === undefined) {
        throw new Error('No current energy data');
    }

    // We have to undo the generation amount here so we can show it separately.
    const billsAssumedConsumedGeneration =
        ((baseline.currentenergy.generation?.annual_generation ?? 0) *
            (baseline.currentenergy.generation?.fraction_used_onsite ?? 0)) /
        (coalesceEmptyString(baseline.TFA, 1) ?? 1);

    const billsData =
        (coalesceEmptyString(baseline.currentenergy.enduse_annual_kwh, 0) ?? 0) /
            (coalesceEmptyString(baseline.TFA, 1) ?? 1) -
        billsAssumedConsumedGeneration;

    return {
        type: 'bar',
        stacked: true,
        units: 'kWh per m² per year',
        bins: [
            billsData
                ? {
                      label: 'Bills data',
                      data: [0, 0, 0, 0, 0, 0, billsData, billsAssumedConsumedGeneration],
                  }
                : null,
            ...scenarioIds.map((id, idx) => {
                const requirements = project.scenario(id).fuel_requirements;
                const floorArea = coalesceEmptyString(project.scenario(id).TFA, 1) ?? 1;
                return {
                    label: scenarioName(id, idx),
                    data: [
                        (requirements?.['waterheating']?.quantity ?? 0) / floorArea,
                        (requirements?.['space_heating']?.quantity ?? 0) / floorArea,
                        (requirements?.['cooking']?.quantity ?? 0) / floorArea,
                        (requirements?.['appliances']?.quantity ?? 0) / floorArea,
                        (requirements?.['lighting']?.quantity ?? 0) / floorArea,
                        (requirements?.['fans_and_pumps']?.quantity ?? 0) / floorArea,
                        0,
                        0,
                    ],
                };
            }),
        ].filter((row): row is BarChart['bins'][0] => row !== null),
        categoryLabels: [
            'Water Heating',
            'Space Heating',
            'Cooking',
            'Appliances',
            'Lighting',
            'Fans and Pumps',
            'Bills data',
            'Assumed consumption',
        ],
        areas: [{ interval: [0, 35], label: 'Target' }],
    };
};

const cumulativeCo2 = (project: ProjectData, scenarioIds: string[]): LineGraph => ({
    type: 'line',
    xAxis: { units: 'years' },
    yAxis: { units: 'kgCO₂' },
    rows: scenarioIds.map((id, idx) => {
        const annualCo2 = project.scenario(id).annualco2 ?? 0;
        return {
            label: scenarioName(id, idx),
            data: [
                [0, 0],
                [1, annualCo2],
                [2, annualCo2 * 2],
                [3, annualCo2 * 3],
                [4, annualCo2 * 4],
                [5, annualCo2 * 5],
                [6, annualCo2 * 6],
                [7, annualCo2 * 7],
                [8, annualCo2 * 8],
                [9, annualCo2 * 9],
                [10, annualCo2 * 10],
            ],
        };
    }),
});

const energyCosts = (project: ProjectData, scenarioIds: string[]): BarChart => {
    const billsData = project.scenario('master').currentenergy?.total_cost ?? 0;
    return {
        type: 'bar',
        stacked: true,
        units: '£ per year',
        bins: [
            billsData
                ? {
                      label: 'Bills data',
                      data: [billsData],
                  }
                : null,
            ...scenarioIds.map((scenarioId, idx) => ({
                label: scenarioName(scenarioId, idx),
                data: [project.scenario(scenarioId).total_cost ?? 0],
            })),
        ].filter((row): row is BarChart['bins'][0] => row !== null),
    };
};

export function generateReportGraphs(
    project: unknown,
    scenarioIds: string[],
): Record<string, BarChart | LineGraph> {
    const parsed = new ProjectData(project);
    return {
        heatBalance: heatBalance(parsed, scenarioIds),
        spaceHeatingDemand: spaceHeatingDemand(parsed, scenarioIds),
        peakHeatingLoad: peakHeatingLoad(parsed, scenarioIds),
        fuelUse: fuelUse(parsed, scenarioIds),
        energyUseIntensity: energyUseIntensity(parsed, scenarioIds),
        cumulativeCo2: cumulativeCo2(parsed, scenarioIds),
        energyCosts: energyCosts(parsed, scenarioIds),
    };
}
