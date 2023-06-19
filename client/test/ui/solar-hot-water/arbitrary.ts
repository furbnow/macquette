import fc from 'fast-check';
import { solarHotWaterDataModel } from '../../../src/data-schemas/scenario/solar-hot-water/v2';
import { makeFormStateTransforms } from '../../../src/data-schemas/visitable-types/form-state';
import { LoadedState } from '../../../src/ui/modules/solar-hot-water';
import { makeArbitrary } from '../../helpers/make-arbitrary';

const { toFormState } = makeFormStateTransforms(solarHotWaterDataModel);

export function arbitraryState(): fc.Arbitrary<LoadedState | 'loading'> {
    return fc.oneof(
        fc.constant('loading' as const),
        fc.record({
            scenarioLocked: fc.boolean(),
            showAllCalcs: fc.boolean(),
            input: makeArbitrary(solarHotWaterDataModel).map((modelData) =>
                toFormState(modelData),
            ),
            combinedModules: fc.constant(null),
        }),
    );
}
