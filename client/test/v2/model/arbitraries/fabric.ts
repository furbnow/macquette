import fc from 'fast-check';
import { Orientation } from '../../../../src/v2/model/enums/orientation';
import { Overshading } from '../../../../src/v2/model/enums/overshading';
import { fcOptional, merge } from '../../../helpers/arbitraries';
import { sensibleFloat, stringySensibleFloat, stringyNumber } from './numeric-values';

const stringyDimension = stringySensibleFloat().filter((v) => v !== '0');

const commonElement = (id?: number) =>
    fc.record({
        id: id !== undefined ? fc.constant(id) : sensibleFloat,
        uvalue: stringySensibleFloat(),
        kvalue: stringySensibleFloat(),
        area: stringySensibleFloat(),
    });

const wallLike = (id?: number) =>
    merge(
        commonElement(id),
        fc.record({
            type: fc.oneof(
                ...(['Wall', 'Party_wall', 'Loft', 'Roof'] as const).map(fc.constant),
            ),
            l: stringyDimension,
            h: stringyDimension,
        }),
    );

const subtractFrom = (mainElementsIds?: number[]) => {
    let arbId: fc.Arbitrary<number>;
    if (mainElementsIds === undefined) {
        arbId = sensibleFloat;
    } else if (mainElementsIds.length === 0) {
        return fc.oneof(fc.constant('no'), fc.constant(undefined));
    } else {
        arbId = fc.oneof(...mainElementsIds.map(fc.constant));
    }
    return fc.oneof(
        arbId,
        arbId.map((id) => id.toString(10)),
        fc.constant('no'),
        fc.constant(undefined),
    );
};

const windowLike = (id?: number) =>
    merge(
        commonElement(id),
        fc.record({
            type: fc.oneof(
                ...(['Door', 'Roof_light', 'window', 'Window'] as const).map(fc.constant),
            ),
            g: stringySensibleFloat(),
            gL: stringySensibleFloat(),
            ff: stringySensibleFloat(),
            l: stringyDimension,
            h: stringyDimension,
            orientation: stringyNumber(
                fc.integer({ min: 0, max: Orientation.names.length - 1 }),
            ),
            overshading: stringyNumber(
                fc.integer({ min: 0, max: Overshading.names.length - 1 }),
            ),
        }),
    );

const hatch = (id?: number) =>
    merge(
        commonElement(id),
        fc.record({
            type: fc.constant('Hatch' as const),
            l: stringyDimension,
            h: stringyDimension,
        }),
    );

const floor = (id?: number) =>
    merge(
        commonElement(id),
        fc.record({
            type: fc.constant('Floor' as const),
        }),
    );

// Build our elements arbitrary so that
// (a) all elements have a unique ID, and
// (b) all the deductible elements are subtracted from either a main element or
// nothing. This deliberately does not cover the case where a deductible is
// subtracted from another deductible, because that should not happen.
const arbIds = fc
    .record({
        // WallLikes can have deductions
        numWallLikes: fc.nat({ max: 20 }),
        // Floors cannot have deductions
        numFloors: fc.nat({ max: 20 }),
        numDeductible: fc.nat({ max: 20 }),
    })
    .chain(({ numWallLikes, numFloors, numDeductible }) =>
        fc
            .set(sensibleFloat, {
                minLength: numWallLikes + numFloors + numDeductible,
                maxLength: numWallLikes + numFloors + numDeductible,
            })
            .map((ids) => ({
                idsWallLikes: ids.slice(0, numWallLikes),
                idsFloors: ids.slice(numWallLikes, numWallLikes + numFloors),
                idsDeductible: ids.slice(numWallLikes + numFloors),
            })),
    )
    .chain(({ idsWallLikes, idsFloors, idsDeductible }) =>
        fc.record({
            wallLikes: fc.constant(idsWallLikes),
            floors: fc.constant(idsFloors),
            deductibles: fc.tuple(
                ...idsDeductible.map((id) =>
                    fc.record({
                        id: fc.constant(id),
                        subtractFromId: subtractFrom(idsWallLikes),
                    }),
                ),
            ),
        }),
    );
const elements = arbIds.chain((ids) => {
    const wallLikes = ids.wallLikes.map((id) => wallLike(id));
    const floors = ids.floors.map((id) => floor(id));
    const deductibles = ids.deductibles.map(({ id, subtractFromId }) =>
        merge(
            fc.oneof(windowLike(id), hatch(id)),
            fc.constant({ subtractfrom: subtractFromId }),
        ),
    );
    const all = fc
        .tuple(...wallLikes, ...floors, ...deductibles)
        .chain((arr) => fc.shuffledSubarray(arr, { minLength: arr.length }));
    return all;
});

export const arbFabric = () =>
    fc
        .record({
            elements: fcOptional(elements),
            thermal_bridging_yvalue: stringyNumber(sensibleFloat).filter(
                (sn) => sn !== '',
            ),
            global_TMP: fcOptional(
                fc.oneof(fc.boolean(), fc.integer({ min: 0, max: 1 })),
            ),
            global_TMP_value: fcOptional(fc.option(sensibleFloat, { nil: null })),
        })
        .filter(({ global_TMP, global_TMP_value }) => {
            // Make sure that if global_TMP is truthy then global_TMP_value is set to something
            return (
                !global_TMP ||
                (global_TMP_value !== null && global_TMP_value !== undefined)
            );
        });
