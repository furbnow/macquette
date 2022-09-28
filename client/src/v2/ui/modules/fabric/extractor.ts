import { Scenario } from '../../../data-schemas/scenario';
import type {
    AppliedWall as LegacyAppliedWall,
    AreaInputs as LegacyAreaInputs,
} from '../../../data-schemas/scenario/fabric';
import { isWallLike } from '../../../data-schemas/scenario/fabric';
import { coalesceEmptyString } from '../../../data-schemas/scenario/value-schemas';
import { Result } from '../../../helpers/result';
import { calcMeasureQtyAndCost } from '../../../measures';
import { reverseCalcQuantity } from '../../../measures';
import type { LegacyContext } from '../../module-management/shim';
import { noOutput } from '../../output-components/numeric';
import type { Action } from './reducer';
import type { State, WallLike, AreaSpec } from './state';

export const thermalMassParameterTable: {
    value: null | 100 | 250 | 450;
    label: State['thermalMassParameter'];
}[] = [
    { value: 100, label: 'low' },
    { value: 250, label: 'medium' },
    { value: 450, label: 'high' },
];

function calcAreaSpec(
    areaInputs: LegacyAreaInputs | undefined,
    area: number | '',
    length: number | '',
    height: number | '',
): AreaSpec {
    const type = areaInputs?.type ?? 'legacy';

    switch (type) {
        case 'legacy': {
            const legacyModelWouldCalculateArea =
                height !== '' && height !== 0 && length !== '' && length !== 0;

            if (legacyModelWouldCalculateArea) {
                return {
                    type: 'dimensions',
                    specific: {
                        area: coalesceEmptyString(area, null),
                    },
                    dimensions: {
                        length,
                        height,
                        area: length * height,
                    },
                };
            } else {
                return {
                    type: 'specific',
                    specific: { area: coalesceEmptyString(area, null) },
                    dimensions: { length: null, height: null, area: null },
                };
            }
        }
        case 'specific':
        case 'dimensions': {
            const specific = areaInputs?.specific ?? { area: null };
            const dimensions = areaInputs?.dimensions ?? {
                area: null,
                height: null,
                length: null,
            };

            return { type, specific, dimensions };
        }
    }
}

function extractWallElementFromLegacy(legacyWall: LegacyAppliedWall): WallLike {
    return {
        id: legacyWall.id,
        type: 'element',
        element: {
            tag: legacyWall.lib,
            type: legacyWall.type,
            name: legacyWall.name,
            description: legacyWall.description,
            source: legacyWall.source,
            uvalue: legacyWall.uvalue,
            kvalue: legacyWall.kvalue,
        },
        inputs: {
            location: legacyWall.location,
            area: calcAreaSpec(
                legacyWall.areaInputs,
                legacyWall.area,
                legacyWall.l,
                legacyWall.h,
            ),
        },
        outputs: {
            windowArea: legacyWall.windowarea ?? noOutput,
            netArea: legacyWall.netarea ?? noOutput,
            heatLoss: legacyWall.wk ?? noOutput,
        },
        revertTo: null,
    };
}

function extractWallFromLegacy(
    legacyWall: LegacyAppliedWall,
    fabric: Scenario['fabric'],
    bulkMeasures: State['bulkMeasures'],
): WallLike {
    function findMeasureIdx(id: number): number | null {
        const measuresList = fabric?.measures ?? {};

        const bulkMeasure = bulkMeasures.find((measure) =>
            measure.appliesTo.includes(id),
        );
        if (bulkMeasure !== undefined) {
            return bulkMeasure.id;
        }

        const measure = measuresList[id];
        if (measure !== undefined && measure.original_elements === undefined) {
            return id;
        }

        return null;
    }

    const measureIdx = findMeasureIdx(legacyWall.id);
    if (measureIdx !== null) {
        const area = calcAreaSpec(
            legacyWall.areaInputs,
            legacyWall.area,
            legacyWall.l,
            legacyWall.h,
        );

        // We only use measure data for stuff that is constant across
        // different elements, i.e. not inputs or calculations
        const measureData = fabric?.measures?.[measureIdx]?.measure;
        if (measureData === undefined) {
            throw new Error(`unreachable (bad array access ${measureIdx})`);
        } else if (!('type' in measureData)) {
            throw new Error(`no type in measure data (array index ${measureIdx})`);
        } else if (
            measureData.type !== 'external wall' &&
            measureData.type !== 'party wall' &&
            measureData.type !== 'roof' &&
            measureData.type !== 'loft'
        ) {
            throw new Error(
                `Measure data for ${legacyWall.type} is ${measureData.type})`,
            );
        }

        let [costQuantity, costTotal] = calcMeasureQtyAndCost({
            costUnits: 'sqm',
            area: area[area.type].area ?? 0,
            costPerUnit: measureData.cost,
            baseCost: measureData.min_cost,
            isExternalWallInsulation: measureData.EWI,
        });

        if (
            'cost_total' in legacyWall &&
            legacyWall.cost_total !== undefined &&
            legacyWall.cost_total !== costTotal
        ) {
            // In future we should provide the user with an option to use the amended cost
            costTotal = legacyWall.cost_total;
        }

        if ('quantity' in legacyWall) {
            if (
                legacyWall.quantity !== undefined &&
                legacyWall.quantity !== costQuantity
            ) {
                // In future we should provide the user with an option to use the amended quantity
                costQuantity = legacyWall.quantity;
            }
        } else {
            // We don't have a quantity at all, so reverse calc it.
            costQuantity = reverseCalcQuantity(
                measureData.min_cost,
                measureData.cost,
                costTotal,
            );
        }

        let type = legacyWall.type;

        // Sometimes loft elements have the wrong type ("roof"). Fix that by using the
        // type data from the measure tags.
        if ('tags' in measureData && measureData.tags !== undefined) {
            const tagType = measureData.tags[0];
            const namedType = legacyWall.type;
            if (tagType !== namedType) {
                type = tagType;
            }
        }

        return {
            id: legacyWall.id,
            type: 'measure',
            element: {
                tag: legacyWall.lib,
                type,
                name: legacyWall.name,
                source: legacyWall.source !== '' ? legacyWall.source : measureData.source,
                uvalue: legacyWall.uvalue,
                kvalue: legacyWall.kvalue,
                EWI: measureData.EWI,
                associated_work: measureData.associated_work,
                benefits: measureData.benefits,
                cost: measureData.cost,
                cost_units: measureData.cost_units,
                description: measureData.description,
                disruption: measureData.disruption,
                key_risks: measureData.key_risks,
                min_cost: measureData.min_cost,
                maintenance: measureData.maintenance,
                notes: measureData.notes,
                performance: measureData.performance,
                who_by: measureData.who_by,
            },
            inputs: {
                location: legacyWall.location,
                area: calcAreaSpec(
                    legacyWall.areaInputs,
                    legacyWall.area,
                    legacyWall.l,
                    legacyWall.h,
                ),
            },
            outputs: {
                windowArea: legacyWall.windowarea ?? noOutput,
                netArea: legacyWall.netarea ?? noOutput,
                heatLoss: legacyWall.wk ?? noOutput,
                costQuantity,
                costTotal,
            },
            revertTo: null,
        };
    }

    return extractWallElementFromLegacy(legacyWall);
}

function extractBulkMeasures(fabric: Scenario['fabric']): State['bulkMeasures'] {
    return Object.entries(fabric?.measures ?? {})
        .filter(([, v]) => 'original_elements' in v)
        .map(([k, v]) => ({
            id: parseInt(k, 10),
            appliesTo: Object.values(
                v['original_elements'] !== undefined ? v.original_elements : {},
            ).map((element) => element.id),
        }));
}

function thermalMassParameter(scenario: Scenario): State['thermalMassParameter'] {
    const { fabric } = scenario;
    if (fabric?.global_TMP !== true) {
        return 'no override';
    } else {
        return (
            thermalMassParameterTable.find(
                ({ value }) => fabric.global_TMP_value === value,
            )?.label ?? 'no override'
        );
    }
}

function maxId(scenario: Scenario) {
    const { fabric } = scenario;
    const allIds = [
        fabric?.elements?.map((element) => element.id),
        Object.keys(fabric?.measures ?? {}).map((key) => parseInt(key)),
    ]
        .flat(1)
        .filter((id): id is number => id !== undefined);
    allIds.sort((a, b) => a - b);
    return allIds.slice(-1)[0] ?? 0;
}

export function extractUpdateAction({
    project,
    currentScenario,
    scenarioId,
}: LegacyContext): Result<Action, never> {
    const { fabric } = currentScenario;

    const bulkMeasuresByScenario = Object.fromEntries(
        Object.entries(project.data).map(([scenarioId, { fabric }]) => [
            scenarioId,
            extractBulkMeasures(fabric),
        ]),
    );
    const bulkMeasures = bulkMeasuresByScenario[scenarioId];
    if (bulkMeasures === undefined) {
        throw new Error('unreachable');
    }

    function getOriginalElement(id: number) {
        const createdFrom = currentScenario?.created_from;
        if (createdFrom === undefined) {
            return null;
        }
        const prevScenario = project.data[createdFrom];
        const prevBulkMeasures = bulkMeasuresByScenario[createdFrom];
        if (prevScenario === undefined || prevBulkMeasures === undefined) {
            return null;
        }
        const legacyRevertTarget = prevScenario.fabric?.elements?.find(
            (element) => element.id === id,
        );
        return legacyRevertTarget ?? null;
    }

    const walls: WallLike[] =
        fabric?.elements?.filter(isWallLike).map((legacyWall) => {
            const wall = extractWallFromLegacy(legacyWall, fabric, bulkMeasures);
            if (wall.type === 'measure') {
                const element = getOriginalElement(wall.id);
                if (element !== null && isWallLike(element)) {
                    wall.revertTo = extractWallElementFromLegacy(element);
                }
            }
            return wall;
        }) ?? [];

    return Result.ok({
        type: 'external data update',
        state: {
            maxId: maxId(currentScenario),
            currentScenarioIsBaseline: scenarioId === 'master',
            thermalMassParameter: thermalMassParameter(currentScenario),
            walls,
            deletedElement: null,
            bulkMeasures,
            locked: currentScenario.locked ?? false,
        },
    });
}
