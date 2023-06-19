import { cloneDeep } from 'lodash';
import { z } from 'zod';

import { projectSchema } from '../../../src/data-schemas/project';
import { compareFloats } from '../../../src/helpers/fuzzy-float-equality';
import { fabricModule } from '../../../src/ui/modules/fabric';
import { projects } from '../../fixtures';

function isVariationAcceptable() {
    return function isVariationAcceptableInner(
        _path: string,
        modMissing: boolean,
        modValue: unknown,
        origMissing: boolean,
        origValue: unknown,
    ) {
        // Matching values are OK
        if (modMissing === origMissing && origValue === modValue) {
            return true;
        }

        // New values in the modification are OK
        if (origMissing === true) {
            return true;
        }

        if (typeof modValue === 'number' && typeof origValue === 'number') {
            return compareFloats(origValue, modValue);
        }

        return false;
    };
}

function normaliseRawScenario(
    rawProject: z.input<typeof projectSchema>,
    currentScenarioId: string,
) {
    const rawScenario = rawProject.data[currentScenarioId] ?? {};

    rawScenario.fabric = rawScenario.fabric ?? {};
    rawScenario.fabric.elements = rawScenario.fabric.elements ?? [];
    rawScenario.fabric.measures = rawScenario.fabric.measures ?? {};

    // Legacy boolean conversion
    if (rawScenario.fabric.global_TMP === 1) {
        rawScenario.fabric.global_TMP = true;
    }
    if (rawScenario.fabric.global_TMP === undefined) {
        rawScenario.fabric.global_TMP = false;
    }

    // New code doesn't keep around old value if not in use
    if (rawScenario.fabric.global_TMP === false) {
        delete rawScenario.fabric.global_TMP_value;
    }

    const shouldBeLoft = new Set<number>();
    const shouldBeRoof = new Set<number>();

    for (const [id, measure] of Object.entries(rawScenario.fabric.measures).filter(
        ([, measure]) =>
            (measure as any).measure.type === 'Wall' ||
            (measure as any).measure.type === 'Roof' ||
            (measure as any).measure.type === 'Loft' ||
            (measure as any).measure.type === 'Party_wall' ||
            (measure as any).measure.tags[0] === 'Wall' ||
            (measure as any).measure.tags[0] === 'Roof' ||
            (measure as any).measure.tags[0] === 'Loft' ||
            (measure as any).measure.tags[0] === 'Party_wall',
    )) {
        const measureAny = measure as any;

        const measureId = parseInt(id, 10);
        measureAny.measure.id = measureId;

        if (
            measureAny.measure.min_cost === '' ||
            measureAny.measure.min_cost === undefined
        ) {
            measureAny.measure.min_cost = 0;
        } else {
            measureAny.measure.min_cost = parseInt(measureAny.measure.min_cost, 10);
        }
        measureAny.measure.cost = parseInt(measureAny.measure.cost, 10);

        // 'lib' is where we store the ID of the library item, but some measures also
        // have a tag, which is out of date (often the tag of the original element).
        delete measureAny.measure.tag;

        // Walls don't have ff, g or gL but the input extractor adds them.
        delete measureAny.measure.ff;
        delete measureAny.measure.g;
        delete measureAny.measure.gL;

        // Measures don't contain the results of calculations or anything that the user
        // enters directly
        delete measureAny.measure.area;
        delete measureAny.measure.h;
        delete measureAny.measure.l;
        delete measureAny.measure.netarea;
        delete measureAny.measure.windowarea;
        delete measureAny.measure.wk;

        // Lofts are often stored wrongly as roofs
        if (measureAny.measure.type === 'Roof' && measureAny.measure.tags[0] === 'Loft') {
            shouldBeLoft.add(measureId);
            measureAny.measure.type = 'Loft';
        } else if (
            measureAny.measure.type === 'Loft' &&
            measureAny.measure.tags[0] === 'Roof'
        ) {
            shouldBeRoof.add(measureId);
            measureAny.measure.type = 'Roof';
        }

        // cost units should always be sqm - that they aren't was a mistake in the
        // library. This makes no impact on the costs calculated, but it will if they
        // are recalculated in future.
        measureAny.measure.cost_units = 'sqm';

        // We give all wall measures the EWI flag to simplify the schema
        measureAny.measure.EWI = measureAny.measure.EWI ?? false;

        // We don't make use of this, because we get the 'original' element from the
        // parent scenario
        delete measureAny.original_element;

        // Occurs on 3 assessments, not sure why, but it's unused.
        delete measureAny.measure.scenario;

        // Corrections are often made here
        delete measureAny.measure.location;

        // original_elements has to be much simpler, with most data erased
        if ('original_elements' in measureAny) {
            // Normalise to only have ids
            measureAny.original_elements = Object.fromEntries(
                Object.entries(measureAny.original_elements).map(([k, v]) => [
                    k,
                    { id: (v as any).id },
                ]),
            );
        }
    }

    // Prune away all measures with no elements they're applied to
    for (const key in rawScenario.fabric.measures) {
        if (
            Object.keys(rawScenario?.fabric.measures[key]?.original_elements ?? {})
                .length === 0
        ) {
            delete rawScenario.fabric.measures[key];
        }
    }

    for (const element of rawScenario.fabric.elements.filter(
        (element: any) =>
            element.type === 'Wall' ||
            element.type === 'Roof' ||
            element.type === 'Loft' ||
            element.type === 'Party_wall',
    )) {
        const elementAny = element as any;

        elementAny.kvalue = parseFloat(elementAny.kvalue);
        if (elementAny.cost === '') {
            delete elementAny.cost;
        } else {
            elementAny.cost = parseFloat(elementAny.cost);
        }

        elementAny.location = elementAny.location.toString();

        // 'l' and 'h' are legacy and we use areaInputs now
        delete elementAny.l;
        delete elementAny.h;

        // Walls don't have ff, g or gL but the input extractor adds them.
        delete elementAny.ff;
        delete elementAny.g;
        delete elementAny.gL;

        // Non-measures shouldn't have these fields
        if (!(elementAny.id in rawScenario.fabric.measures)) {
            delete elementAny.associated_work;
            delete elementAny.benefits;
            delete elementAny.cost;
            delete elementAny.disruption;
            delete elementAny.EWI;
            delete elementAny.maintenance;
            delete elementAny.notes;
            delete elementAny.performance;
            delete elementAny.quantity;
            delete elementAny.who_by;
            delete elementAny.cost_total;
        }

        // Some roofs and lofts have contradictory data.  The correct data source is
        // the 'tag' field from the measures data.
        if (shouldBeLoft.has(element.id)) {
            elementAny.tags = ['Loft'];
            elementAny.type = 'Loft';
        } else if (shouldBeRoof.has(element.id)) {
            elementAny.tags = ['Roof'];
            elementAny.type = 'Roof';
        }

        if (!('tags' in elementAny) || elementAny.tags.length === 0) {
            // Tags are only present on measures in the legacy system; to simplify the
            // output logic, we now always include tags as well as types
            elementAny.tags = [elementAny.type];
        }
    }
}

function normaliseOutputScenario(currentScenario: unknown) {
    const dataAny = currentScenario as any;

    const sourceForId: Record<string, string> = {};

    for (const [, measure] of Object.entries(dataAny.fabric.measures).filter(
        ([, measure]) =>
            (measure as any).measure.type === 'Wall' ||
            (measure as any).measure.type === 'Roof' ||
            (measure as any).measure.type === 'Loft' ||
            (measure as any).measure.type === 'Party_wall' ||
            (measure as any).measure.tags[0] === 'Wall' ||
            (measure as any).measure.tags[0] === 'Roof' ||
            (measure as any).measure.tags[0] === 'Loft' ||
            (measure as any).measure.tags[0] === 'Party_wall',
    )) {
        const measureAny = measure as any;

        sourceForId[measureAny.measure.id] = measureAny.measure.source;
    }

    for (const element of dataAny.fabric.elements.filter(
        (element: any) =>
            element.type === 'Wall' ||
            element.type === 'Roof' ||
            element.type === 'Loft' ||
            element.type === 'Party_wall',
    )) {
        const newSource = sourceForId[element.id];
        if (newSource !== undefined) {
            element.source = newSource;
        }
    }
}

describe('fabric page extractor & mutator round trip should roundtrip the data adequately', () => {
    test.each(projects)('$fixturePath', (project) => {
        const scenarios = project.parsedData.data;

        const modifiedProject = cloneDeep(project.rawData);
        for (const [currentScenarioId, currentScenario] of Object.entries(scenarios)) {
            let state = fabricModule.initialState('');

            const updateActions = fabricModule.shims
                .extractUpdateAction(
                    {
                        project: project.parsedData,
                        currentScenario,
                        scenarioId: currentScenarioId,
                        currentModel: null as any,
                        route: {
                            type: 'with scenario',
                            scenarioId: currentScenarioId,
                            page: 'elements',
                        },
                        appName: 'some app name',
                        userId: '0',
                    },
                    '',
                    { inputs: true, outputs: true },
                )
                .unwrap();
            expect(updateActions).toHaveLength(1);
            [state] = fabricModule.reducer(state, updateActions[0]!);

            fabricModule.shims.mutateLegacyData(
                { project: modifiedProject },
                { scenarioId: currentScenarioId },
                state,
                '',
            );

            normaliseRawScenario(project.rawData as any, currentScenarioId);
        }

        for (const [currentScenarioId, currentScenario] of Object.entries(
            (modifiedProject as any).data,
        )) {
            normaliseOutputScenario(currentScenario);
            expect({ [currentScenarioId]: (currentScenario as any)?.fabric }).toEqualBy(
                {
                    [currentScenarioId]: (project.rawData as any).data[currentScenarioId]
                        ?.fabric,
                },
                isVariationAcceptable(),
            );
        }

        // Run the model and ensure the outputs for both raw & modified are the same
        // This essentially checks that 'isVariationAcceptable' flags up the right
        // changes.
        // DISABLED: too CPU-intensive for normal runs.
        /*
        import { calcRun } from '../../src/model/model';

        for (const [, scenario] of Object.entries((project.rawData as any).data)) {
            calcRun(scenario);
        }
        for (const [, scenario] of Object.entries((modifiedProject as any).data)) {
            calcRun(scenario);
        }

        expect(modifiedProject).toEqualBy(
            project.rawData,
            isVariationAcceptable(),
        );
        */
    });
});
