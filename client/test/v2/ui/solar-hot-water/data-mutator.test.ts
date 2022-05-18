import fc from 'fast-check';
import { cloneDeep } from 'lodash';

import { scenarioSchema } from '../../../../src/v2/data-schemas/scenario';
import { solarHotWaterModule } from '../../../../src/v2/ui/modules/solar-hot-water';
import { arbScenarioInputs } from '../../model/arbitraries/scenario';
import { arbitraryState } from './arbitrary';

describe('solar hot water data mutator', () => {
    test('the resulting project object passes the project validator', () => {
        const arb = fc.record({
            state: fc.record({
                commonState: fc.record({
                    locked: fc.boolean(),
                }),
                moduleState: arbitraryState(),
            }),
            externals: fc
                .tuple(fc.string(), arbScenarioInputs())
                .map(([scenarioId, scenario]) => ({
                    scenarioId,
                    project: {
                        data: {
                            [scenarioId]: scenario,
                        },
                    },
                })),
        });
        fc.assert(
            fc.property(arb, ({ state, externals }) => {
                const toMutate = cloneDeep(externals);
                solarHotWaterModule.dataMutator(externals, state);
                expect(() =>
                    scenarioSchema.parse(toMutate.project.data[externals.scenarioId]),
                ).not.toThrow();
            }),
        );
    });

    test('the resulting scenario object has version: 1 under SHW', () => {
        const arb = fc.record({
            state: fc.record({
                commonState: fc.record({
                    locked: fc.boolean(),
                    scenarioId: fc.constant('master'),
                }),
                moduleState: arbitraryState(),
            }),
            externals: fc
                .tuple(fc.string(), arbScenarioInputs())
                .map(([scenarioId, scenario]) => ({
                    scenarioId,
                    project: {
                        data: {
                            [scenarioId]: scenario,
                        },
                    },
                })),
        });
        fc.assert(
            fc.property(arb, ({ state, externals }) => {
                const toMutate = cloneDeep(externals);
                solarHotWaterModule.dataMutator(toMutate, state);
                expect(
                    (toMutate.project.data[externals.scenarioId] as any).SHW.version,
                ).toBe(1);
            }),
        );
    });

    it('copies the state input into the scenario SHW input, with special handling for pumpType and moduleEnabled', () => {
        const arb = fc.record({
            state: fc.record({
                commonState: fc.record({
                    locked: fc.boolean(),
                    scenarioId: fc.constant('master'),
                }),
                moduleState: arbitraryState(),
            }),
            externals: fc
                .tuple(fc.string(), arbScenarioInputs())
                .map(([scenarioId, scenario]) => ({
                    scenarioId,
                    project: {
                        data: {
                            [scenarioId]: scenario,
                        },
                    },
                })),
        });
        fc.assert(
            fc.property(arb, ({ state, externals }) => {
                const { pumpType, moduleEnabled, ...copiableInputs } =
                    state.moduleState.inputs;
                const toMutate: any = cloneDeep(externals);
                solarHotWaterModule.dataMutator(toMutate, state);
                expect(toMutate.project.data[externals.scenarioId].SHW.input).toEqual(
                    copiableInputs,
                );
                expect(toMutate.project.data[externals.scenarioId].SHW.pump).toBe(
                    pumpType,
                );
                expect(toMutate.project.data[externals.scenarioId].use_SHW).toBe(
                    moduleEnabled,
                );
                expect(
                    toMutate.project.data[externals.scenarioId].water_heating
                        .solar_water_heating,
                ).toBe(moduleEnabled);
            }),
        );
    });

    it('does not modify any scenario other than the current one', () => {
        const arb = fc.record({
            state: fc.record({
                commonState: fc.record({
                    locked: fc.boolean(),
                    scenarioId: fc.constant('master'),
                }),
                moduleState: arbitraryState(),
            }),
            externals: fc
                .record({
                    scenarioId: fc.string(),
                    currentScenario: arbScenarioInputs(),
                    nonCurrentScenarios: fc.dictionary(fc.string(), arbScenarioInputs()),
                })
                .map(({ scenarioId, currentScenario, nonCurrentScenarios }) => ({
                    scenarioId,
                    project: {
                        data: {
                            ...nonCurrentScenarios,
                            [scenarioId]: currentScenario,
                        },
                    },
                })),
        });
        fc.assert(
            fc.property(arb, ({ state, externals }) => {
                const toMutate = cloneDeep(externals);
                solarHotWaterModule.dataMutator(toMutate, state);
                // Delete the scenarios we expect to be mutated
                delete toMutate.project.data[externals.scenarioId];
                delete externals.project.data[externals.scenarioId];
                // Then check nothing else has changed
                expect(toMutate).toEqual(externals);
            }),
        );
    });

    it('does not modify the state', () => {
        const arb = fc.record({
            state: fc.record({
                commonState: fc.record({
                    locked: fc.boolean(),
                    scenarioId: fc.constant('master'),
                }),
                moduleState: arbitraryState(),
            }),
            externals: fc
                .tuple(fc.string(), arbScenarioInputs())
                .map(([scenarioId, scenario]) => ({
                    scenarioId,
                    project: {
                        data: {
                            [scenarioId]: scenario,
                        },
                    },
                })),
        });
        fc.assert(
            fc.property(arb, ({ state, externals }) => {
                const toNotMutate = cloneDeep(state);
                solarHotWaterModule.dataMutator(externals, toNotMutate);
                expect(toNotMutate).toEqual(state);
            }),
        );
    });
});
