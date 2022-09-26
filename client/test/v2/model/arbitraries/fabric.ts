import fc from 'fast-check';
import { z } from 'zod';

import { floorSchema } from '../../../../src/v2/data-schemas/scenario/fabric';
import { isTruthy } from '../../../../src/v2/helpers/is-truthy';
import { Orientation } from '../../../../src/v2/model/enums/orientation';
import { Overshading } from '../../../../src/v2/model/enums/overshading';
import { fcOptional, merge } from '../../../helpers/arbitraries';
import { sensibleFloat, stringySensibleFloat, stringyNumber } from './values';

const uppercaseLetter = fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
const digit = fc.constantFrom(...'1234567890'.split(''));
const elementTag = fc
    .tuple(uppercaseLetter, uppercaseLetter, digit, digit)
    .map(([a, b, c, d]) => `${a}${b}${c}${d}`);
const stringyDimension = stringySensibleFloat().filter((v) => v !== '0');

export function arbCommonElement(id?: number) {
    return fc.record({
        lib: elementTag,
        name: fc.string(),
        id: id !== undefined ? fc.constant(id) : sensibleFloat,
        location: fc.string(),
        uvalue: stringySensibleFloat(),
        kvalue: stringySensibleFloat(),

        /*
            In the wild, we see stringy areas on fabric elements, but making
            the area stringy in the arbitrary can result in some very deep and
            hard to detect string concatenation errors in the legacy model.

            For example, if any of the elements in a particular category (e.g.
            window-like elements) have a stringy area, a concatenation bug will
            occur -- unless the element's dimensions are also specified, in
            which case the area is computed as a non-stringy number by
            multiplying them, or unless the stringy area is '' and subsequent
            elements' areas are also '', in which case it comes right in the
            end, and also if the partial sum of areas up to that element is
            fractional, subsequent areas may also be '0' without triggering the
            bug.

            If an error like this were to occur in a real scenario, it would be
            picked up by the fixed data golden master tests as a value
            difference between legacy and live anyway.
        */
        area: sensibleFloat,
    });
}

function wallLike(id?: number) {
    return merge(
        arbCommonElement(id),
        fc.record({
            type: fc.oneof(
                ...(['Wall', 'Party_wall', 'Loft', 'Roof'] as const).map(fc.constant),
            ),
            l: stringyDimension,
            h: stringyDimension,
        }),
    );
}

function subtractFrom(mainElementsIds?: number[]) {
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
}

function windowLike(id?: number) {
    return merge(
        arbCommonElement(id),
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
}

function hatch(id?: number) {
    return merge(
        arbCommonElement(id),
        fc.record({
            type: fc.constant('Hatch' as const),
            l: stringyDimension,
            h: stringyDimension,
        }),
    );
}

function floor(id?: number): fc.Arbitrary<z.input<typeof floorSchema>> {
    return merge(
        arbCommonElement(id),
        fc.record({
            type: fc.constant('Floor' as const),
            area: sensibleFloat,
            perimeter: sensibleFloat,
        }),
    );
}

// Build our elements arbitrary so that
// (a) all elements have a unique ID, and
// (b) all the deductible elements are subtracted from either a main element or
// nothing. This deliberately does not cover the case where a deductible is
// subtracted from another deductible, because that should not happen.
const arbIds = fc
    .record({
        // WallLikes can have deductions
        numWallLikes: fc.nat({ max: 10 }),
        // Floors cannot have deductions
        numFloors: fc.nat({ max: 5 }),
        numDeductible: fc.nat({ max: 10 }),
    })
    .chain(({ numWallLikes, numFloors, numDeductible }) =>
        fc
            .set(fc.nat(), {
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

export function arbFabric() {
    return fc
        .record({
            elements: fcOptional(elements),
            thermal_bridging_yvalue: stringyNumber(sensibleFloat).filter(
                (sn) => sn !== '',
            ),
            global_TMP: fcOptional(
                fc.oneof(fc.boolean(), fc.constant(0 as const), fc.constant(1 as const)),
            ),
            global_TMP_value: fcOptional(fc.option(sensibleFloat, { nil: null })),
        })
        .filter(({ global_TMP, global_TMP_value }) => {
            // Make sure that if global_TMP is truthy then global_TMP_value is set to something
            return (
                !isTruthy(global_TMP) ||
                (global_TMP_value !== null && global_TMP_value !== undefined)
            );
        });
}
