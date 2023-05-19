import fc from 'fast-check';
import { cloneDeep } from 'lodash';
import { z } from 'zod';
import { projectSchema } from '../../../../src/v2/data-schemas/project';

import { scenarioSchema } from '../../../../src/v2/data-schemas/scenario';
import { solarHotWaterDataModel } from '../../../../src/v2/data-schemas/scenario/solar-hot-water/v2';
import { makeFormStateTransforms } from '../../../../src/v2/data-schemas/visitable-types/form-state';
import {
    LoadedState,
    solarHotWaterModule,
} from '../../../../src/v2/ui/modules/solar-hot-water';
import { FcInfer } from '../../../helpers/arbitraries';
import {
    ProjectInput,
    arbitraryProjectInputsWithoutScenarios,
} from '../../arbitraries/project-inputs';
import { arbScenarioInputs } from '../../arbitraries/scenario-inputs';
import { arbitraryState } from './arbitrary';

describe('solar hot water data mutator', () => {
    test('the mutated project passes the validator', () => {
        const arb = fc.record({
            state: arbitraryState(),
            scenarioId: fc.string(),
            scenarioInput: arbScenarioInputs(),
            moduleKey: fc.string(),
            restOfProject: arbitraryProjectInputsWithoutScenarios(),
        });
        const examples: Array<[FcInfer<typeof arb>]> = [];
        fc.assert(
            fc.property(
                arb,
                ({ state, scenarioId, scenarioInput, moduleKey, restOfProject }) => {
                    const toMutate = {
                        project: {
                            ...restOfProject,
                            data: { [scenarioId]: cloneDeep(scenarioInput) },
                        } satisfies ProjectInput,
                    };
                    solarHotWaterModule.shims.mutateLegacyData(
                        toMutate,
                        { scenarioId },
                        state,
                        moduleKey,
                    );
                    expect(() => projectSchema.parse(toMutate.project)).not.toThrow();
                },
            ),
            { examples },
        );
    });

    test('the resulting scenario object has version: 2 under SHW', () => {
        const arb = fc.record({
            state: arbitraryState().filter((s) => s !== 'loading'),
            scenarioId: fc.string(),
            scenarioInput: arbScenarioInputs(),
            moduleKey: fc.string(),
            restOfProject: arbitraryProjectInputsWithoutScenarios(),
        });
        fc.assert(
            fc.property(
                arb,
                ({ state, scenarioId, scenarioInput, moduleKey, restOfProject }) => {
                    const toMutate = {
                        project: {
                            ...restOfProject,
                            data: { [scenarioId]: cloneDeep(scenarioInput) },
                        } satisfies ProjectInput,
                    };
                    solarHotWaterModule.shims.mutateLegacyData(
                        toMutate,
                        { scenarioId },
                        state,
                        moduleKey,
                    );
                    expect((toMutate.project as any).data[scenarioId].SHW.version).toBe(
                        2,
                    );
                },
            ),
        );
    });

    it('copies the transformed form state into the scenario SHW input, with special handling for pumpType and moduleEnabled', () => {
        const arb = fc.record({
            state: arbitraryState()
                .filter((s) => s !== 'loading')
                .map((s) => s as LoadedState),
            scenarioId: fc.string(),
            scenarioInput: arbScenarioInputs(),
            moduleKey: fc.string(),
            restOfProject: arbitraryProjectInputsWithoutScenarios(),
        });
        const { fromFormState } = makeFormStateTransforms(solarHotWaterDataModel);
        fc.assert(
            fc.property(
                arb,
                ({ state, scenarioId, scenarioInput, moduleKey, restOfProject }) => {
                    const moduleEnabled = !state.input.isNull;
                    const toMutate = {
                        project: {
                            ...restOfProject,
                            data: { [scenarioId]: cloneDeep(scenarioInput) },
                        } satisfies ProjectInput,
                    };
                    solarHotWaterModule.shims.mutateLegacyData(
                        toMutate,
                        { scenarioId },
                        state,
                        moduleKey,
                    );
                    const mutatedScenario = (
                        toMutate.project as z.input<typeof projectSchema>
                    ).data[scenarioId]!;
                    expect((mutatedScenario.SHW as any).input).toEqual(
                        fromFormState(state.input),
                    );
                    expect(mutatedScenario.use_SHW).toBe(moduleEnabled);
                    expect(mutatedScenario.water_heating!.solar_water_heating).toBe(
                        moduleEnabled,
                    );
                },
            ),
        );
    });

    it('does not modify any scenario other than the current one', () => {
        const arb = fc.record({
            state: arbitraryState(),
            scenarioId: fc.string(),
            currentScenario: arbScenarioInputs(),
            nonCurrentScenarios: fc.dictionary(
                fc.string(),
                arbScenarioInputs().map((i) => scenarioSchema.parse(i)),
            ),
            moduleKey: fc.string(),
            restOfProject: arbitraryProjectInputsWithoutScenarios(),
        });
        fc.assert(
            fc.property(
                arb,
                ({
                    state,
                    scenarioId,
                    currentScenario,
                    nonCurrentScenarios,
                    moduleKey,
                    restOfProject,
                }) => {
                    const original = {
                        project: {
                            ...restOfProject,
                            data: {
                                ...nonCurrentScenarios,
                                [scenarioId]: currentScenario,
                            },
                        } satisfies ProjectInput,
                    };
                    const toMutate = cloneDeep(original);
                    solarHotWaterModule.shims.mutateLegacyData(
                        toMutate,
                        { scenarioId },
                        state,
                        moduleKey,
                    );
                    // Delete the scenarios we expect to be mutated
                    delete original.project.data[scenarioId];
                    delete toMutate.project.data[scenarioId];
                    // Then check nothing else has changed
                    expect(toMutate).toEqual(original);
                },
            ),
        );
    });

    it('does not modify the state', () => {
        const arb = fc.record({
            state: arbitraryState(),
            scenarioId: fc.string(),
            scenario: arbScenarioInputs(),
            moduleKey: fc.string(),
            restOfProject: arbitraryProjectInputsWithoutScenarios(),
        });
        fc.assert(
            fc.property(
                arb,
                ({ state, scenarioId, scenario, moduleKey, restOfProject }) => {
                    const toNotMutate = cloneDeep(state);
                    solarHotWaterModule.shims.mutateLegacyData(
                        {
                            project: {
                                ...restOfProject,
                                data: { [scenarioId]: scenario },
                            } satisfies ProjectInput,
                        },
                        { scenarioId },
                        state,
                        moduleKey,
                    );
                    expect(toNotMutate).toEqual(state);
                },
            ),
        );
    });
});
