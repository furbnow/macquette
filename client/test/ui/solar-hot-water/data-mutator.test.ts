import fc from 'fast-check';
import { cloneDeep } from 'lodash';
import { z } from 'zod';
import { projectSchema } from '../../../src/data-schemas/project';

import { makeFormStateTransforms } from '../../../src/data-schemas/visitable-types/form-state';
import { solarHotWaterInput } from '../../../src/model/modules/solar-hot-water';
import {
  LoadedState,
  solarHotWaterModule,
} from '../../../src/ui/modules/solar-hot-water';
import {
  ProjectInput,
  arbitraryProjectInputsWithoutScenarios,
} from '../../arbitraries/project-inputs';
import { FcInfer } from '../../helpers/arbitraries';
import { arbitraryState } from './arbitrary';

describe('solar hot water data mutator', () => {
  test('the mutated project passes the validator', () => {
    const arb = fc.record({
      state: arbitraryState(),
      scenarioId: fc.string(),
      moduleKey: fc.string(),
      restOfProject: arbitraryProjectInputsWithoutScenarios(),
    });
    const examples: Array<[FcInfer<typeof arb>]> = [];
    fc.assert(
      fc.property(arb, ({ state, scenarioId, moduleKey, restOfProject }) => {
        const toMutate = {
          project: {
            ...restOfProject,
            data: { [scenarioId]: {} },
          } satisfies ProjectInput,
        };
        solarHotWaterModule.shims.mutateLegacyData(
          toMutate,
          { scenarioId },
          state,
          moduleKey,
        );
        expect(() => projectSchema.parse(toMutate.project)).not.toThrow();
      }),
      { examples },
    );
  });

  test('the resulting scenario object has version: 2 under SHW', () => {
    const arb = fc.record({
      state: arbitraryState().filter((s) => s !== 'loading'),
      scenarioId: fc.string(),
      moduleKey: fc.string(),
      restOfProject: arbitraryProjectInputsWithoutScenarios(),
    });
    fc.assert(
      fc.property(arb, ({ state, scenarioId, moduleKey, restOfProject }) => {
        const toMutate = {
          project: {
            ...restOfProject,
            data: { [scenarioId]: {} },
          } satisfies ProjectInput,
        };
        solarHotWaterModule.shims.mutateLegacyData(
          toMutate,
          { scenarioId },
          state,
          moduleKey,
        );
        expect((toMutate.project as any).data[scenarioId].SHW.version).toBe(2);
      }),
    );
  });

  it('copies the transformed form state into the scenario SHW input, with special handling for pumpType and moduleEnabled', () => {
    const arb = fc.record({
      state: arbitraryState()
        .filter((s) => s !== 'loading')
        .map((s) => s as LoadedState),
      scenarioId: fc.string(),
      moduleKey: fc.string(),
      restOfProject: arbitraryProjectInputsWithoutScenarios(),
    });
    const { fromFormState } = makeFormStateTransforms(solarHotWaterInput);
    fc.assert(
      fc.property(arb, ({ state, scenarioId, moduleKey, restOfProject }) => {
        const moduleEnabled = !state.input.isNull;
        const toMutate = {
          project: {
            ...restOfProject,
            data: { [scenarioId]: {} },
          } satisfies ProjectInput,
        };
        solarHotWaterModule.shims.mutateLegacyData(
          toMutate,
          { scenarioId },
          state,
          moduleKey,
        );
        const mutatedScenario = (toMutate.project as z.input<typeof projectSchema>).data[
          scenarioId
        ]!;
        expect((mutatedScenario.SHW as any).input).toEqual(fromFormState(state.input));
        expect(mutatedScenario.use_SHW).toBe(moduleEnabled);
        expect(mutatedScenario.water_heating!.solar_water_heating).toBe(moduleEnabled);
      }),
    );
  });

  it('does not modify any scenario other than the current one', () => {
    const arb = fc.record({
      state: arbitraryState(),
      scenarioId: fc.string(),
      otherScenarioIds: fc.array(fc.string()),
      moduleKey: fc.string(),
      restOfProject: arbitraryProjectInputsWithoutScenarios(),
    });
    fc.assert(
      fc.property(
        arb,
        ({ state, scenarioId, otherScenarioIds, moduleKey, restOfProject }) => {
          const original = {
            project: {
              ...restOfProject,
              data: Object.fromEntries([
                ...otherScenarioIds.map((id) => [id, {}]),
                [scenarioId, {}],
              ]),
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
      moduleKey: fc.string(),
      restOfProject: arbitraryProjectInputsWithoutScenarios(),
    });
    fc.assert(
      fc.property(arb, ({ state, scenarioId, moduleKey, restOfProject }) => {
        const toNotMutate = cloneDeep(state);
        solarHotWaterModule.shims.mutateLegacyData(
          {
            project: {
              ...restOfProject,
              data: { [scenarioId]: {} },
            } satisfies ProjectInput,
          },
          { scenarioId },
          state,
          moduleKey,
        );
        expect(toNotMutate).toEqual(state);
      }),
    );
  });
});
