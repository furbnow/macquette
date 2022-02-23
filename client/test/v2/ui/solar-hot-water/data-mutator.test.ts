import fc from 'fast-check';
import { legacyScenarioSchema } from '../../../../src/v2/legacy-state-validators/scenario';
import { solarHotWaterModule } from '../../../../src/v2/ui/modules/solar-hot-water';
import { arbScenarioInputs } from '../../model/arbitraries/scenario';
import { arbitraryState } from './arbitrary';
import { cloneDeep } from 'lodash';

describe('solar hot water data mutator', () => {
    test('the resulting scenario object passes the legacy scenario validator', () => {
        const arb = fc.record({
            state: fc.record({
                commonState: fc.record({ locked: fc.boolean() }),
                moduleState: arbitraryState(),
            }),
            scenarioInputs: arbScenarioInputs(),
        });
        fc.assert(
            fc.property(arb, ({ state, scenarioInputs }) => {
                const toMutate = cloneDeep(scenarioInputs);
                solarHotWaterModule.dataMutator(toMutate, state);
                expect(() => legacyScenarioSchema.parse(toMutate)).not.toThrow();
            }),
        );
    });

    test('the resulting scenario object has version: 1 under SHW', () => {
        const arb = fc.record({
            state: fc.record({
                commonState: fc.record({ locked: fc.boolean() }),
                moduleState: arbitraryState(),
            }),
            scenarioInputs: arbScenarioInputs(),
        });
        fc.assert(
            fc.property(arb, ({ state, scenarioInputs }) => {
                const toMutate: unknown = cloneDeep(scenarioInputs);
                solarHotWaterModule.dataMutator(toMutate, state);
                expect((toMutate as any).SHW.version).toBe(1);
            }),
        );
    });

    it('copies the state input into the scenario SHW input, with special handling for pumpType and moduleEnabled', () => {
        const arb = fc.record({
            state: fc.record({
                commonState: fc.record({ locked: fc.boolean() }),
                moduleState: arbitraryState(),
            }),
            scenarioInputs: arbScenarioInputs(),
        });
        fc.assert(
            fc.property(arb, ({ state, scenarioInputs }) => {
                const { pumpType, moduleEnabled, ...copiableInputs } =
                    state.moduleState.inputs;
                const toMutate: any = cloneDeep(scenarioInputs);
                solarHotWaterModule.dataMutator(toMutate, state);
                expect(toMutate.SHW.input).toEqual(copiableInputs);
                expect(toMutate.SHW.pump).toBe(pumpType);
                expect(toMutate.use_SHW).toBe(moduleEnabled);
                expect(toMutate.water_heating.solar_water_heating).toBe(moduleEnabled);
            }),
        );
    });
});
