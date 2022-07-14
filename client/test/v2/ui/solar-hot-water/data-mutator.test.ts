import fc from 'fast-check';
import { cloneDeep } from 'lodash';

import { scenarioSchema } from '../../../../src/v2/data-schemas/scenario';
import { safeMerge } from '../../../../src/v2/helpers/safe-merge';
import { Externals } from '../../../../src/v2/shims/typed-globals';
import {
    LoadedState,
    solarHotWaterModule,
} from '../../../../src/v2/ui/modules/solar-hot-water';
import { arbScenarioInputs } from '../../model/arbitraries/scenario';
import { arbitraryState } from './arbitrary';

const externals: fc.Arbitrary<Pick<Externals, 'project' | 'scenarioId'>> = fc
    .tuple(
        fc.string(),
        arbScenarioInputs().map((inputs) => scenarioSchema.parse(inputs)),
    )
    .map(([scenarioId, scenario]) => ({
        scenarioId,
        project: {
            data: {
                [scenarioId]: scenario,
            },
        },
    }));
describe('solar hot water data mutator', () => {
    test('the resulting scenario object passes the scenario validator', () => {
        const arb = fc.record({
            state: arbitraryState(),
            externals,
            moduleKey: fc.string(),
        });
        fc.assert(
            fc.property(arb, ({ state, externals, moduleKey }) => {
                const toMutate = cloneDeep(externals);
                solarHotWaterModule.shims.mutateLegacyData(toMutate, state, moduleKey);
                expect(() =>
                    scenarioSchema.parse(
                        (toMutate.project as any).data[toMutate.scenarioId as any],
                    ),
                ).not.toThrow();
            }),
        );
    });

    test('the resulting scenario object has version: 1 under SHW', () => {
        const arb = fc.record({
            state: arbitraryState().filter((s) => s !== 'loading'),
            externals,
            moduleKey: fc.string(),
        });
        fc.assert(
            fc.property(arb, ({ state, externals, moduleKey }) => {
                const toMutate = cloneDeep(externals);
                solarHotWaterModule.shims.mutateLegacyData(toMutate, state, moduleKey);
                expect(
                    (toMutate.project as any).data[toMutate.scenarioId as any].SHW
                        .version,
                ).toBe(1);
            }),
        );
    });

    it('copies the state input into the scenario SHW input, with special handling for pumpType and moduleEnabled', () => {
        const arb = fc.record({
            state: arbitraryState()
                .filter((s) => s !== 'loading')
                .map((s) => s as LoadedState),
            externals,
            moduleKey: fc.string(),
        });
        fc.assert(
            fc.property(arb, ({ state, externals, moduleKey }) => {
                const { pumpType, moduleEnabled, modelInput } = state;
                const toMutate: any = cloneDeep(externals);
                solarHotWaterModule.shims.mutateLegacyData(toMutate, state, moduleKey);
                expect(toMutate.project.data[toMutate.scenarioId].SHW.input).toEqual(
                    modelInput,
                );
                expect(toMutate.project.data[toMutate.scenarioId].SHW.pump).toBe(
                    pumpType,
                );
                expect(toMutate.project.data[toMutate.scenarioId].use_SHW).toBe(
                    moduleEnabled,
                );
                expect(
                    toMutate.project.data[toMutate.scenarioId].water_heating
                        .solar_water_heating,
                ).toBe(moduleEnabled);
            }),
        );
    });

    it('does not modify any scenario other than the current one', () => {
        const arb = fc.record({
            state: arbitraryState(),
            baseExternals: externals,
            nonCurrentScenarios: fc.dictionary(
                fc.string(),
                arbScenarioInputs().map((i) => scenarioSchema.parse(i)),
            ),
            moduleKey: fc.string(),
        });
        fc.assert(
            fc.property(
                arb,
                ({ state, baseExternals, nonCurrentScenarios, moduleKey }) => {
                    const externals = cloneDeep(baseExternals);
                    const project: any = externals.project;
                    project.data = safeMerge(project.data, nonCurrentScenarios);
                    const toMutate = cloneDeep(externals);
                    solarHotWaterModule.shims.mutateLegacyData(
                        toMutate,
                        state,
                        moduleKey,
                    );
                    // Delete the scenarios we expect to be mutated
                    delete (toMutate.project as any).data[externals.scenarioId as any];
                    delete project.data[externals.scenarioId as any];
                    delete (toMutate as any).currentScenario;
                    delete (externals as any).currentScenario;
                    // Then check nothing else has changed
                    expect(toMutate).toEqual(externals);
                },
            ),
        );
    });

    it('does not modify the state', () => {
        const arb = fc.record({
            state: arbitraryState(),
            externals,
            moduleKey: fc.string(),
        });
        fc.assert(
            fc.property(arb, ({ state, externals, moduleKey }) => {
                const toNotMutate = cloneDeep(state);
                solarHotWaterModule.shims.mutateLegacyData(externals, state, moduleKey);
                expect(toNotMutate).toEqual(state);
            }),
        );
    });
});
