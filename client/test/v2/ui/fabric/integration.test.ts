import { cloneDeep } from 'lodash';

import { projectSchema } from '../../../../src/v2/data-schemas/project';
import type {
    CompleteWall,
    CompleteWallMeasure,
} from '../../../../src/v2/ui/input-components/libraries';
import { fabricModule } from '../../../../src/v2/ui/modules/fabric';
import type { Action } from '../../../../src/v2/ui/modules/fabric/reducer';
import { State } from '../../../../src/v2/ui/modules/fabric/state';

/**
 * Run reducer actions with an external update / mutate legacy data cycle between each one.
 */
function runReducerActions(
    state: State,
    actions: Action[],
    project: unknown,
    currentScenarioId: string,
): State {
    for (const action of actions) {
        const parseResult = projectSchema.safeParse(project);
        if (!parseResult.success) {
            throw new Error(parseResult.error.toString());
        }

        const parsedCurrentScenario = (parseResult.data as any).data[currentScenarioId];
        const updateAction = fabricModule.shims.extractUpdateAction(
            {
                project: parseResult.data,
                currentScenario: parsedCurrentScenario,
                scenarioId: currentScenarioId,
            },
            '',
        );
        [state] = fabricModule.reducer(state, updateAction.unwrap());

        [state] = fabricModule.reducer(state, action);

        fabricModule.shims.mutateLegacyData(
            { project, scenarioId: currentScenarioId },
            state,
            '',
        );
    }

    return state;
}

function wrapScenarioData<T>(scenarioData: T) {
    return {
        project: {
            id: '2',
            name: 'donk',
            description: '',
            status: 'In progress',
            created_at: '2022-01-24T18:08:00.727951Z',
            updated_at: '2022-01-24T18:08:00.727951Z',
            owner: { id: '1', name: '', email: '' },
            organisation: null,
            data: {
                master: scenarioData,
            },
            images: [],
        },
        scenarioId: 'master',
    };
}

function fillWall(partial?: Partial<CompleteWall>): CompleteWall {
    return {
        tag: 'TAG',
        name: 'name',
        description: 'description',
        source: 'nowhere',
        tags: ['Wall'],
        uvalue: 1,
        kvalue: 135,
        ...partial,
    };
}

function fillWallMeasure(partial?: Partial<CompleteWallMeasure>): CompleteWallMeasure {
    return {
        tag: 'TAG-M',
        name: 'measure name',
        description: 'measure description',
        source: 'nowhere',
        tags: ['Wall'],
        uvalue: 1,
        kvalue: 135,
        min_cost: 100,
        cost: 100,
        cost_units: 'sqm',
        associated_work: 'none',
        benefits: 'none',
        disruption: 'none',
        key_risks: 'none',
        maintenance: 'none',
        notes: 'none',
        performance: 'none',
        who_by: 'noone',
        EWI: false,
        ...partial,
    };
}

describe('setting the thermal mass parameter', () => {
    test('should produce the correct blob output', () => {
        const scenarioData = {};
        const { project, scenarioId } = wrapScenarioData(scenarioData);

        runReducerActions(
            cloneDeep(fabricModule.initialState('')),
            [
                {
                    type: 'fabric/set thermal mass parameter',
                    value: 'medium',
                },
            ],
            project,
            scenarioId,
        );

        expect(scenarioData).toEqual({
            fabric: {
                elements: [],
                measures: {},
                global_TMP: true,
                global_TMP_value: 250,
            },
        });
    });
});

describe('merging wall input', () => {
    test('should calculate area correctly when a wall is set to use dimensions for area', () => {
        const scenarioData = {};
        const { project, scenarioId } = wrapScenarioData(scenarioData);

        runReducerActions(
            cloneDeep(fabricModule.initialState('')),
            [
                {
                    type: 'fabric/add wall',
                    item: fillWall({ tag: 'TAG1' }),
                },
                {
                    type: 'fabric/merge wall input',
                    id: 1,
                    value: {
                        area: {
                            type: 'dimensions',
                            dimensions: { length: 10, height: 2 },
                        },
                    },
                },
            ],
            project,
            scenarioId,
        );

        expect((scenarioData as any).fabric.elements[0].area).toEqual(10 * 2);
    });
});

describe('reverting an element', () => {
    test('should revert to the appropriate element from a previous scenario', () => {
        const baselineData = {};
        const { project, scenarioId: baselineScenarioId } =
            wrapScenarioData(baselineData);

        // Create us a scenario with a wall in we can revert to
        runReducerActions(
            cloneDeep(fabricModule.initialState('')),
            [
                {
                    type: 'fabric/add wall',
                    item: fillWall({ tag: 'TAG' }),
                },
            ],
            project,
            baselineScenarioId,
        );

        const scenarioData = cloneDeep(baselineData);
        const scenarioId = 'scenario1';
        (project as any).data[scenarioId] = {
            created_from: baselineScenarioId,
            ...scenarioData,
        };

        // Set up a measure so we can revert
        runReducerActions(
            cloneDeep(fabricModule.initialState('')),
            [
                {
                    type: 'fabric/apply wall measures',
                    item: fillWallMeasure({ tag: 'MEASURE' }),
                    ids: [1],
                },
            ],
            project,
            scenarioId,
        );

        expect((scenarioData as any).fabric.elements[0].lib).toBe('MEASURE');

        // Revert it
        runReducerActions(
            cloneDeep(fabricModule.initialState('')),
            [
                {
                    type: 'fabric/revert wall measure',
                    id: 1,
                },
            ],
            project,
            scenarioId,
        );

        expect((scenarioData as any).fabric.elements[0].lib).toBe('TAG');
        expect((scenarioData as any).fabric.measures).toEqual({});
    });
});

describe('applying a measure', () => {
    test('to a element in a bulk measure should remove the measure from the bulk measure', () => {
        const scenarioData = {};
        const { project, scenarioId } = wrapScenarioData(scenarioData);

        runReducerActions(
            cloneDeep(fabricModule.initialState('')),
            [
                {
                    type: 'fabric/add wall',
                    item: fillWall({ tag: 'TAG1' }),
                },
                {
                    type: 'fabric/add wall',
                    item: fillWall({ tag: 'TAG2' }),
                },
                {
                    type: 'fabric/apply wall measures',
                    item: fillWallMeasure(),
                    ids: [1, 2],
                },
                {
                    type: 'fabric/apply wall measures',
                    item: fillWallMeasure(),
                    ids: [1],
                },
            ],
            project,
            scenarioId,
        );

        // @ts-expect-error because we have no type for an unparsed scenario
        expect(Object.keys(scenarioData.fabric.measures)).toHaveLength(2);
        // @ts-expect-error because we have no type for an unparsed scenario
        expect(Object.values(scenarioData.fabric.measures)[1].original_elements).toEqual({
            '2': { id: 2 },
        });
    });

    test("and then changing the element's dimensions should change the cost", () => {
        const scenarioData = {};
        const { project, scenarioId } = wrapScenarioData(scenarioData);

        let state = runReducerActions(
            cloneDeep(fabricModule.initialState('')),
            [
                {
                    type: 'fabric/add wall',
                    item: fillWall({ tag: 'TAG1' }),
                },
                {
                    type: 'fabric/merge wall input',
                    id: 1,
                    value: {
                        area: {
                            type: 'specific',
                            specific: { area: 100 },
                        },
                    },
                },
                {
                    type: 'fabric/apply wall measures',
                    item: fillWallMeasure({
                        min_cost: 1000,
                        cost: 50,
                    }),
                    ids: [1],
                },
            ],
            project,
            scenarioId,
        );

        expect(state.walls).toHaveLength(1);
        expect((scenarioData as any).fabric.elements[0].cost_total).toBe(1000 + 50 * 100);

        state = runReducerActions(
            cloneDeep(fabricModule.initialState('')),
            [
                {
                    type: 'fabric/merge wall input',
                    id: 1,
                    value: {
                        area: {
                            type: 'specific',
                            specific: { area: 50 },
                        },
                    },
                },
            ],
            project,
            scenarioId,
        );

        expect((scenarioData as any).fabric.elements[0].cost_total).toBe(1000 + 50 * 50);
    });
});

test('applying and removing bulk measures', () => {
    const scenarioData = {};
    const { project, scenarioId } = wrapScenarioData(scenarioData);
    const state = cloneDeep(fabricModule.initialState(''));

    runReducerActions(
        state,
        [
            {
                type: 'fabric/add wall',
                item: fillWall({ tag: 'TAG1' }),
            },
            {
                type: 'fabric/add wall',
                item: fillWall({ tag: 'TAG2' }),
            },
            {
                type: 'fabric/apply wall measures',
                item: fillWallMeasure(),
                ids: [1, 2],
            },
        ],
        project,
        scenarioId,
    );

    // should only produce a single measure
    // @ts-expect-error because we have no type for an unparsed scenario
    expect(Object.keys(scenarioData.fabric.measures)).toHaveLength(1);

    runReducerActions(
        state,
        [
            {
                type: 'fabric/delete wall',
                id: 1,
            },
            {
                type: 'fabric/delete wall',
                id: 2,
            },
        ],
        project,
        scenarioId,
    );

    expect(scenarioData).toEqual({
        fabric: {
            elements: [],
            measures: {},
            global_TMP: false,
        },
    });
});
