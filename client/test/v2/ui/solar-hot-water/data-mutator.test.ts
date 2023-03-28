import fc from 'fast-check';
import { cloneDeep } from 'lodash';
import { z } from 'zod';
import { projectSchema } from '../../../../src/v2/data-schemas/project';

import { scenarioSchema } from '../../../../src/v2/data-schemas/scenario';
import {
    LoadedState,
    solarHotWaterModule,
} from '../../../../src/v2/ui/modules/solar-hot-water';
import { arbScenarioInputs } from '../../model/arbitraries/scenario';
import { arbitraryState } from './arbitrary';

describe('solar hot water data mutator', () => {
    test('the mutated project passes the validator', () => {
        const arb = fc.record({
            state: arbitraryState(),
            scenarioId: fc.string(),
            scenarioInput: arbScenarioInputs(),
            moduleKey: fc.string(),
        });
        fc.assert(
            fc.property(arb, ({ state, scenarioId, scenarioInput, moduleKey }) => {
                const toMutate = {
                    project: { data: { [scenarioId]: cloneDeep(scenarioInput) } },
                };
                solarHotWaterModule.shims.mutateLegacyData(
                    toMutate,
                    { scenarioId },
                    state,
                    moduleKey,
                );
                expect(() => projectSchema.parse(toMutate.project)).not.toThrow();
            }),
        );
    });

    test('the resulting scenario object has version: 1 under SHW', () => {
        const arb = fc.record({
            state: arbitraryState().filter((s) => s !== 'loading'),
            scenarioId: fc.string(),
            scenarioInput: arbScenarioInputs(),
            moduleKey: fc.string(),
        });
        fc.assert(
            fc.property(arb, ({ state, scenarioId, scenarioInput, moduleKey }) => {
                const toMutate = {
                    project: { data: { [scenarioId]: cloneDeep(scenarioInput) } },
                };
                solarHotWaterModule.shims.mutateLegacyData(
                    toMutate,
                    { scenarioId },
                    state,
                    moduleKey,
                );
                expect((toMutate.project as any).data[scenarioId].SHW.version).toBe(1);
            }),
        );
    });

    it('copies the state input into the scenario SHW input, with special handling for pumpType and moduleEnabled', () => {
        const arb = fc.record({
            state: arbitraryState()
                .filter((s) => s !== 'loading')
                .map((s) => s as LoadedState),
            scenarioId: fc.string(),
            scenarioInput: arbScenarioInputs(),
            moduleKey: fc.string(),
        });
        fc.assert(
            fc.property(arb, ({ state, scenarioId, scenarioInput, moduleKey }) => {
                const { pumpType, moduleEnabled, modelInput } = state;
                const toMutate = {
                    project: { data: { [scenarioId]: cloneDeep(scenarioInput) } },
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
                expect((mutatedScenario.SHW as any).input).toEqual(modelInput);
                expect(mutatedScenario.SHW!.pump).toBe(pumpType);
                expect(mutatedScenario.use_SHW).toBe(moduleEnabled);
                expect(mutatedScenario.water_heating!.solar_water_heating).toBe(
                    moduleEnabled,
                );
            }),
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
                }) => {
                    const original = {
                        project: {
                            data: {
                                ...nonCurrentScenarios,
                                [scenarioId]: currentScenario,
                            },
                        },
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
        });
        fc.assert(
            fc.property(arb, ({ state, scenarioId, scenario, moduleKey }) => {
                const toNotMutate = cloneDeep(state);
                solarHotWaterModule.shims.mutateLegacyData(
                    { project: { data: { [scenarioId]: scenario } } },
                    { scenarioId },
                    state,
                    moduleKey,
                );
                expect(toNotMutate).toEqual(state);
            }),
        );
    });
});
