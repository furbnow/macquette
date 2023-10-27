import fc from 'fast-check';
import { makeFormStateTransforms } from '../../../src/data-schemas/visitable-types/form-state';
import { solarHotWaterInput } from '../../../src/model/modules/solar-hot-water';
import { LoadedState } from '../../../src/ui/modules/solar-hot-water';
import { makeArbitrary } from '../../helpers/make-arbitrary';

const { toFormState } = makeFormStateTransforms(solarHotWaterInput);

export function arbitraryState(): fc.Arbitrary<LoadedState | 'loading'> {
  return fc.oneof(
    fc.constant('loading' as const),
    fc.record({
      scenarioLocked: fc.boolean(),
      showAllCalcs: fc.boolean(),
      input: makeArbitrary(solarHotWaterInput).map((modelData) => toFormState(modelData)),
      combinedModules: fc.constant(null),
    }),
  );
}
