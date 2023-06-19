import { sum } from '../../../helpers/array-reducers';
import { thermalMassParameterTable } from './extractor';
import type { AppliedWallMeasure, State, WallLike } from './state';

function wallLikeTypeToLegacy(type: 'external wall' | 'party wall' | 'loft' | 'roof') {
    switch (type) {
        case 'external wall': {
            return 'Wall';
        }
        case 'party wall': {
            return 'Party_wall';
        }
        case 'loft': {
            return 'Loft';
        }
        case 'roof': {
            return 'Roof';
        }
    }
}

function wallLikeToLegacy(
    wall: WallLike,
    { includeSpecifics = false }: { includeSpecifics: boolean },
) {
    return {
        lib: wall.element.tag,
        name: wall.element.name,
        type: wallLikeTypeToLegacy(wall.element.type),
        tags: [wallLikeTypeToLegacy(wall.element.type)],
        source: wall.element.source,
        description: wall.element.description,
        uvalue: wall.element.uvalue,
        kvalue: wall.element.kvalue,
        ...(wall.type === 'measure'
            ? {
                  associated_work: wall.element.associated_work,
                  benefits: wall.element.benefits,
                  cost: wall.element.cost,
                  cost_units: wall.element.cost_units,
                  disruption: wall.element.disruption,
                  EWI: wall.element.EWI,
                  key_risks: wall.element.key_risks,
                  maintenance: wall.element.maintenance,
                  min_cost: wall.element.min_cost,
                  notes: wall.element.notes,
                  performance: wall.element.performance,
                  who_by: wall.element.who_by,
              }
            : null),
        ...(includeSpecifics === true
            ? {
                  id: wall.id,
                  area: wall.inputs.area[wall.inputs.area.type].area ?? '',
                  areaInputs: wall.inputs.area,
                  location: wall.inputs.location,
                  ...(wall.outputs.netArea !== null
                      ? { netarea: wall.outputs.netArea }
                      : null),
                  ...(wall.outputs.windowArea !== null
                      ? { windowarea: wall.outputs.windowArea }
                      : null),
                  ...(wall.outputs.heatLoss !== null
                      ? { wk: wall.outputs.heatLoss }
                      : null),
                  ...(wall.type === 'measure'
                      ? {
                            cost_total: wall.outputs.costTotal,
                            quantity: wall.outputs.costQuantity,
                        }
                      : null),
              }
            : null),
    };
}

export function mutateLegacyData(
    { project }: { project: unknown },
    { scenarioId }: { scenarioId: string | null },
    state: State,
) {
    /* eslint-disable
       @typescript-eslint/consistent-type-assertions,
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-assignment,
       @typescript-eslint/no-unsafe-member-access,
       @typescript-eslint/no-unsafe-call,
    */
    const dataAny = (project as any).data[scenarioId as any];

    dataAny.fabric = dataAny.fabric ?? {};
    dataAny.fabric.elements = dataAny.fabric.elements ?? [];
    dataAny.fabric.measures = dataAny.fabric.measures ?? {};

    const thermalMassParameterValue =
        thermalMassParameterTable.find(
            ({ label }) => state.thermalMassParameter === label,
        )?.value ?? null;

    if (thermalMassParameterValue !== null) {
        dataAny.fabric.global_TMP = true;
        dataAny.fabric.global_TMP_value = thermalMassParameterValue;
    } else {
        dataAny.fabric.global_TMP = false;
        delete dataAny.fabric.global_TMP_value;
    }

    for (const wall of state.walls) {
        const legacyWallIdx = dataAny.fabric.elements.findIndex(
            (legacyWall: any) => legacyWall.id === wall.id,
        );

        if (legacyWallIdx === -1) {
            dataAny.fabric.elements.push(
                wallLikeToLegacy(wall, { includeSpecifics: true }),
            );
        } else {
            dataAny.fabric.elements[legacyWallIdx] = wallLikeToLegacy(wall, {
                includeSpecifics: true,
            });

            const inBulkMeasure =
                state.bulkMeasures.findIndex((bm) => bm.appliesTo.includes(wall.id)) !==
                -1;

            if (wall.type === 'measure' && !inBulkMeasure) {
                dataAny.fabric.measures[wall.id] = {
                    measure: {
                        id: wall.id,
                        location: wall.inputs.location,
                        ...wallLikeToLegacy(wall, {
                            includeSpecifics: true,
                        }),
                    },
                };
            } else {
                delete dataAny.fabric.measures[wall.id];
            }
        }
    }

    for (const measure of state.bulkMeasures) {
        if (measure.appliesTo.length === 0) {
            delete dataAny.fabric.measures[measure.id];
        } else {
            const measureElements = measure.appliesTo
                .map((id) => state.walls.find((wall) => wall.id === id))
                .filter(
                    (wall): wall is AppliedWallMeasure =>
                        wall !== undefined && wall.type === 'measure',
                );
            const firstElement = measureElements[0];
            if (firstElement === undefined) {
                // bulkMeasures contains all bulk measures, not just for walls.
                // If we get here it means that this particular bulk measure is not
                // for walls, and therefore we don't change anything.
                continue;
            }

            dataAny.fabric.measures[measure.id] = {
                measure: {
                    id: measure.id,
                    ...wallLikeToLegacy(firstElement, { includeSpecifics: false }),
                    location: measureElements
                        .map((elem) => elem.inputs.location)
                        .join(', '),
                    cost_total: sum(
                        measureElements.map((elem) => elem.outputs.costTotal),
                    ),
                    quantity: sum(
                        measureElements.map((elem) => elem.outputs.costQuantity),
                    ),
                },
                original_elements: Object.fromEntries(
                    measureElements.map((elem) => [elem.id, { id: elem.id }]),
                ),
            };
        }
    }

    if (state.deletedElement !== null) {
        const legacyElementIndex = dataAny.fabric.elements.findIndex(
            (legacyElement: any) => legacyElement.id === state.deletedElement,
        );
        dataAny.fabric.elements.splice(legacyElementIndex, 1);
    }

    /* eslint-enable */
}
