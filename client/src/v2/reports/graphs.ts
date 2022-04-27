import { cloneDeep } from 'lodash';

import { coalesceEmptyString } from '../data-schemas/helpers/legacy-numeric-values';
import { Scenario, scenarioSchema } from '../data-schemas/scenario';
import { isRecord } from '../helpers/is-record';
import { calcRun } from '../model/model';

/** Legacy project data wrapped with a safe accessor function */
class ProjectData {
    private data: Record<string | symbol, unknown>;
    private cache: Record<string, Scenario> = {};

    constructor(data: unknown) {
        if (!isRecord(data)) {
            throw new Error('Project data is not an object');
        }
        this.data = data;
    }

    scenario(id: string): Scenario {
        if (!(id in this.data)) {
            throw new Error(`No scenario with ID ${id}`);
        }
        if (id in this.cache) {
            const result = this.cache[id];
            if (result !== undefined) {
                return result;
            }
        }
        const parsed = scenarioSchema.parse(this.data[id]);
        this.cache[id] = parsed;
        return parsed;
    }

    scenarioRaw(id: string): unknown {
        if (!(id in this.data)) {
            throw new Error(`No scenario with ID ${id}`);
        }
        return this.data[id];
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
    categoryColours?: string[];
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
    categoryColours: ['#e89d25', '#f5bd76', '#4286f4', '#68ab20', '#b5d490'],
});

const spaceHeatingDemand = (project: ProjectData, scenarioIds: string[]): BarChart => ({
    type: 'bar',
    units: 'kWh per m² per year',
    bins: scenarioIds.map((id, idx) => ({
        label: scenarioName(id, idx),
        data: [
            getStandardisedSpaceHeatingDemand(project.scenarioRaw(id)),
            project.scenario(id).space_heating_demand_m2 ?? 0,
        ],
    })),
    categoryLabels: [
        'With standardised heating pattern',
        'With your current heating pattern',
    ],
    categoryColours: ['#9cbdfc', '#4286f4'],
    lines: [{ value: 120, label: 'UK average' }],
    areas: [{ label: 'Target', interval: [20, 70] }],
});

function standardisedHeating(scenario: unknown): Record<string, unknown> {
    const scenarioCopy = cloneDeep(scenario);
    if (!isRecord(scenarioCopy)) {
        throw new Error('Scenario unreadable');
    }

    scenarioCopy['temperature'] = scenarioCopy['temperature'] ?? {};
    if (!isRecord(scenarioCopy['temperature'])) {
        throw new Error('Scenario temperature unreadable');
    }

    scenarioCopy['temperature']['target'] = 21;
    scenarioCopy['temperature']['hours_off'] = {
        weekday: [7, 9],
        weekend: [7, 9],
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const result: unknown = calcRun(scenarioCopy);
    if (isRecord(result)) {
        return result;
    } else {
        throw new Error('Calc running failed');
    }
}

export function getHeatingLoad(scenario: unknown) {
    const scenarioCopy = standardisedHeating(scenario);

    const heatloss =
        typeof scenarioCopy['totalWK'] === 'number' ? scenarioCopy['totalWK'] : 0;
    const temp = 21;
    const temp_low = -4;
    const temp_diff = temp - temp_low;
    const peak_heat = heatloss * temp_diff;
    const area = typeof scenarioCopy['TFA'] === 'number' ? scenarioCopy['TFA'] : 0;
    const peak_heat_m2 = peak_heat / area;

    return {
        heatloss,
        temp,
        temp_low,
        temp_diff,
        peak_heat: peak_heat / 1000, // in kW instead of W
        area,
        peak_heat_m2,
    };
}

function getStandardisedSpaceHeatingDemand(scenario: unknown): number {
    const scenarioCopy = standardisedHeating(scenario);
    const shd = scenarioCopy['space_heating_demand_m2'];
    return typeof shd === 'number' ? shd : 0;
}

const peakHeatingLoad = (project: ProjectData, scenarioIds: string[]): BarChart => ({
    type: 'bar',
    units: 'kW',
    bins: scenarioIds.map((id, idx) => ({
        label: scenarioName(id, idx),
        data: [getHeatingLoad(project.scenarioRaw(id)).peak_heat],
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
        fuelTotals: Record<string, { name: string; quantity: number | null }>,
    ): number[] => {
        const result = [0, 0, 0, 0];

        for (const { name, quantity } of Object.values(fuelTotals)) {
            const fuelType = fuelList?.[name];
            if (fuelType === undefined) {
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

    const hasBillsData =
        billsData[0] !== 0 ||
        billsData[1] !== 0 ||
        billsData[2] !== 0 ||
        billsData[3] !== 0;

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
            billsData !== 0
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

function getUsedFuelNames(project: ProjectData, scenarioIds: string[]): Set<string> {
    const fuelNames: Set<string> = new Set();
    const baselineScenario = project.scenario('master');

    for (const fuelName of Object.keys(
        baselineScenario.currentenergy?.use_by_fuel ?? {},
    )) {
        const annualUse =
            coalesceEmptyString(
                baselineScenario.currentenergy?.use_by_fuel?.[fuelName]?.annual_use,
                0,
            ) ?? 0;
        if (annualUse > 0) {
            fuelNames.add(fuelName);
        }
    }

    for (const scenarioId of scenarioIds) {
        const scenario = project.scenario(scenarioId);
        if (scenario.fuel_totals === null) {
            continue;
        }
        for (const fuel of Object.values(scenario.fuel_totals ?? {})) {
            if (fuel.quantity !== 0) {
                fuelNames.add(fuel.name);
            }
        }
    }

    return fuelNames;
}

// Dark, light pairs
const COLOUR_PAIRS: [string, string][] = [
    ['#4286f4', '#9cbdfc'],
    ['#f6a607', '#fce780'],
    ['#18563e', '#408567'],
    ['#66469e', '#9371bd'],
    ['#83332f', '#ec674f'],
];

function selectColourPair(idx: number): [string, string] {
    const pair = COLOUR_PAIRS[idx % COLOUR_PAIRS.length];
    if (pair !== undefined) {
        return pair;
    } else {
        throw Error('unreachable because of modulo');
    }
}

const energyCosts = (project: ProjectData, scenarioIds: string[]): BarChart => {
    const baselineScenario = project.scenario('master');
    const billsData = baselineScenario.currentenergy?.total_cost ?? 0;

    type FuelCostEntry = { name: string; colour: string } & (
        | {
              source: 'UNIT_COST';
              unitCost: number;
          }
        | {
              source: 'STANDING_CHARGE';
              standingCharge: number;
          }
    );

    const usedFuelNames = getUsedFuelNames(project, scenarioIds);

    // Remove generation because we account for it differently.
    usedFuelNames.delete('generation');

    const fuelList = baselineScenario.fuels;
    const costEntries: FuelCostEntry[] = [...usedFuelNames].flatMap((name, idx) => {
        const standingCharge =
            coalesceEmptyString(fuelList?.[name]?.standingcharge, 0) ?? 0;
        const unitCost = coalesceEmptyString(fuelList?.[name]?.fuelcost, 0) ?? 0;
        const colours = selectColourPair(idx);
        if (standingCharge > 0) {
            return [
                { name, source: 'STANDING_CHARGE', standingCharge, colour: colours[0] },
                { name, source: 'UNIT_COST', unitCost, colour: colours[1] },
            ];
        } else {
            return [{ name, source: 'UNIT_COST', unitCost, colour: colours[0] }];
        }
    });

    const billsGenerationCostReduction =
        baselineScenario.currentenergy?.generation?.annual_savings ?? 0;

    return {
        type: 'bar',
        stacked: true,
        units: '£ per year',
        bins: [
            billsData !== 0
                ? {
                      label: 'Bills data',
                      data: [
                          ...costEntries.map((costEntry) => {
                              const amountUsed =
                                  coalesceEmptyString(
                                      baselineScenario.currentenergy?.use_by_fuel?.[
                                          costEntry.name
                                      ]?.annual_use,
                                      0,
                                  ) ?? 0;
                              if (amountUsed === 0) {
                                  return 0;
                              }

                              if (costEntry.source === 'UNIT_COST') {
                                  let totalCost = (amountUsed * costEntry.unitCost) / 100;
                                  if (costEntry.name === 'Standard Tariff') {
                                      totalCost -= billsGenerationCostReduction;
                                      if (totalCost < 0) {
                                          totalCost = 0;
                                      }
                                  }
                                  return totalCost;
                              } else {
                                  return costEntry.standingCharge;
                              }
                          }),
                          billsGenerationCostReduction,
                      ],
                  }
                : null,
            ...scenarioIds.map((scenarioId, idx) => {
                const scenario = project.scenario(scenarioId);
                const generationCostReduction = Math.abs(
                    coalesceEmptyString(
                        scenario.fuel_totals?.['generation']?.annualcost,
                        0,
                    ) ?? 0,
                );

                return {
                    label: scenarioName(scenarioId, idx),
                    data: [
                        ...costEntries.map((costEntry) => {
                            const amountUsed =
                                scenario.fuel_totals?.[costEntry.name]?.quantity ?? 0;
                            if (amountUsed === 0) {
                                return 0;
                            }

                            if (costEntry.source === 'UNIT_COST') {
                                let totalCost = (amountUsed * costEntry.unitCost) / 100;
                                if (costEntry.name === 'Standard Tariff') {
                                    totalCost -= generationCostReduction;
                                    if (totalCost < 0) {
                                        totalCost = 0;
                                    }
                                }
                                return totalCost;
                            } else {
                                return costEntry.standingCharge;
                            }
                        }),
                        generationCostReduction,
                    ],
                };
            }),
        ].filter((row): row is BarChart['bins'][0] => row !== null),
        categoryLabels: [
            ...costEntries.map(({ name, source }) => {
                if (name === 'Standard Tariff') {
                    name = 'Electricity';
                }
                return `${name} ${source === 'UNIT_COST' ? 'use' : 'standing charge'}`;
            }),
            'Assumed saving from generation',
        ],
        categoryColours: [...costEntries.map(({ colour }) => colour), '#bbbbbb'],
    };
};

// Remove NaNs to work around the model sometimes outputting NaNs.
// NaNs get serialized to null, which trips up the server-side type checker - it's
// expecting only numbers.
// Instead of wrapping every call in the above with NaN checks, just do it in one go,
// it results in cleaner code.
function removeNaNs(name: string, chart: BarChart) {
    for (const bin of chart.bins) {
        for (const [idx, datapoint] of bin.data.entries()) {
            if (!Number.isNaN(datapoint)) {
                continue;
            }

            bin.data[idx] = 0;
            console.warn(`Graph ${name}, bin ${bin.label}, datapoint idx ${idx} was NaN`);
        }
    }
}

export function generateReportGraphs(
    project: unknown,
    scenarioIds: string[],
): Record<string, BarChart | LineGraph> {
    const parsed = new ProjectData(project);
    const bars = {
        heatBalance: heatBalance(parsed, scenarioIds),
        spaceHeatingDemand: spaceHeatingDemand(parsed, scenarioIds),
        peakHeatingLoad: peakHeatingLoad(parsed, scenarioIds),
        fuelUse: fuelUse(parsed, scenarioIds),
        energyUseIntensity: energyUseIntensity(parsed, scenarioIds),
        energyCosts: energyCosts(parsed, scenarioIds),
    };
    for (const [name, graph] of Object.entries(bars)) {
        removeNaNs(name, graph);
    }
    return {
        ...bars,
        cumulativeCo2: cumulativeCo2(parsed, scenarioIds),
    };
}
